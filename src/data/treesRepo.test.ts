import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createIdbMock } from '../test/idbMock.ts';
import type { Tree } from '../types/tree.ts';

const idb = createIdbMock();

vi.mock('../lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('./syncQueue.ts', () => ({ enqueueMutation: vi.fn(), flush: vi.fn() }));
vi.mock('./photoSync.ts', () => ({ queuePhoto: vi.fn() }));
vi.mock('../lib/idb.ts', () => ({
  idbGetAll: (store: 'trees_cache') => idb.idbGetAll(store),
  idbPut: (store: 'trees_cache', v: Tree) => idb.idbPut(store, v),
}));

const { mergePending } = await import('./treesRepo.ts');

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
    const base = [tree('server', '2026-01-01T00:00:00Z')];

    const merged = await mergePending(base);

    expect(merged.map((t) => t.clientId)).toEqual(['local', 'server']);
  });

  it('sorts by createdAt descending', async () => {
    idb.stores.trees_cache.set('old', tree('old', '2026-01-01T00:00:00Z'));
    const base = [
      tree('new', '2026-03-01T00:00:00Z'),
      tree('mid', '2026-02-01T00:00:00Z'),
    ];

    const merged = await mergePending(base);

    expect(merged.map((t) => t.clientId)).toEqual(['new', 'mid', 'old']);
  });
});
