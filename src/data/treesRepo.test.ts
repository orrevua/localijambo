import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createIdbMock } from '../test/idbMock.ts';
import type { PendingMutation } from '../lib/idb.ts';
import type { Tree } from '../types/tree.ts';

const idb = createIdbMock();

const deleteEq = vi.fn(async () => ({ error: null }));
vi.mock('../lib/supabase.ts', () => ({
  supabase: {
    from: () => ({ delete: () => ({ eq: deleteEq }) }),
  },
}));
vi.mock('./syncQueue.ts', () => ({
  enqueueMutation: vi.fn((m: Omit<PendingMutation, 'attempts' | 'nextAttemptAt' | 'enqueuedAt'>) =>
    idb.idbPut('pending_mutations', { ...m, attempts: 0, nextAttemptAt: 0, enqueuedAt: 0 }),
  ),
  flush: vi.fn(),
}));
vi.mock('./photoSync.ts', () => ({ queuePhoto: vi.fn() }));
vi.mock('../sync/syncEvents.ts', () => ({ emitSyncChange: vi.fn(), emitTreesChanged: vi.fn() }));
vi.mock('../lib/idb.ts', () => ({
  idbGetAll: (store: 'trees_cache') => idb.idbGetAll(store),
  idbPut: (store: 'trees_cache', v: Tree) => idb.idbPut(store, v),
  idbDelete: (store: 'trees_cache', k: string) => idb.idbDelete(store, k),
  idbGetByClientId: (clientId: string) => idb.idbGetByClientId(clientId),
}));

const { mergePending, remove } = await import('./treesRepo.ts');

function pendingCreate(clientId: string): PendingMutation {
  return { op: 'create', clientId, payload: {}, attempts: 0, nextAttemptAt: 0, enqueuedAt: 0 };
}

function tree(clientId: string, createdAt: string, overrides: Partial<Tree> = {}): Tree {
  return {
    id: clientId,
    clientId,
    ownerId: 'owner-1',
    lon: -34.9,
    lat: -8.05,
    species: 'Syzygium malaccense',
    fruitingStatus: 'none',
    ripeness: 'unknown',
    isShared: false,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('treesRepo.mergePending', () => {
  beforeEach(() => idb.reset());

  it('dedupes by clientId, preferring the base (server) entity', async () => {
    idb.stores.trees_cache.set('a', tree('a', '2026-01-01T00:00:00Z', { species: 'stale-cache' }));
    const base = [tree('a', '2026-01-02T00:00:00Z', { species: 'server-fresh' })];

    const merged = await mergePending(base);

    expect(merged).toHaveLength(1);
    expect(merged[0].species).toBe('server-fresh');
  });

  it('includes cache-only (pending) trees not present in base', async () => {
    idb.stores.trees_cache.set('local', tree('local', '2026-01-03T00:00:00Z'));
    await idb.idbPut('pending_mutations', pendingCreate('local'));
    const base = [tree('server', '2026-01-01T00:00:00Z')];

    const merged = await mergePending(base);

    expect(merged.map((t) => t.clientId)).toEqual(['local', 'server']);
  });

  it('sorts by createdAt descending', async () => {
    idb.stores.trees_cache.set('old', tree('old', '2026-01-01T00:00:00Z'));
    await idb.idbPut('pending_mutations', pendingCreate('old'));
    const base = [tree('new', '2026-03-01T00:00:00Z'), tree('mid', '2026-02-01T00:00:00Z')];

    const merged = await mergePending(base);

    expect(merged.map((t) => t.clientId)).toEqual(['new', 'mid', 'old']);
  });

  it('drops synced cache entries the server no longer returns (deleted elsewhere)', async () => {
    idb.stores.trees_cache.set('gone', tree('gone', '2026-01-03T00:00:00Z'));
    const merged = await mergePending([tree('server', '2026-01-01T00:00:00Z')]);
    expect(merged.map((t) => t.clientId)).toEqual(['server']);
  });

  it('falls back to the whole cache when the server is unreachable', async () => {
    idb.stores.trees_cache.set('a', tree('a', '2026-01-01T00:00:00Z'));
    const merged = await mergePending(null);
    expect(merged.map((t) => t.clientId)).toEqual(['a']);
  });
});

describe('treesRepo.remove', () => {
  beforeEach(() => {
    idb.reset();
    deleteEq.mockClear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('deletes on the server and evicts the cached copy', async () => {
    idb.stores.trees_cache.set('a', tree('a', '2026-01-01T00:00:00Z', { id: 'server-a' }));

    await remove('server-a');

    expect(deleteEq).toHaveBeenCalledWith('client_id', 'a');
    expect(idb.stores.trees_cache.has('a')).toBe(false);
    expect(await mergePending(null)).toEqual([]);
  });

  it('drops a never-synced tree locally without calling the server', async () => {
    idb.stores.trees_cache.set('local', tree('local', '2026-01-01T00:00:00Z'));
    await idb.idbPut('pending_mutations', pendingCreate('local'));

    await remove('local');

    expect(deleteEq).not.toHaveBeenCalled();
    expect(idb.stores.pending_mutations.size).toBe(0);
    expect(idb.stores.trees_cache.size).toBe(0);
  });

  it('queues the delete while offline and hides the tree immediately', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    idb.stores.trees_cache.set('a', tree('a', '2026-01-01T00:00:00Z'));

    await remove('a');

    expect(deleteEq).not.toHaveBeenCalled();
    expect([...idb.stores.pending_mutations.values()][0].op).toBe('delete');
    expect(await mergePending(null)).toEqual([]);
  });
});
