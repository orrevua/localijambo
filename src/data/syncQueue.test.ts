import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createIdbMock } from '../test/idbMock.ts';
import type { PendingMutation } from '../lib/idb.ts';
import type { NewTree } from '../types/tree.ts';

const idb = createIdbMock();

const rpc = vi.fn();
const del = vi.fn();
vi.mock('../lib/supabase.ts', () => ({
  supabase: {
    rpc: (...args: unknown[]) => {
      rpc(...args);
      return { single: async () => ({ data: serverRow, error: null }) };
    },
    from: () => ({ delete: () => ({ eq: async () => del() ?? { error: null } }) }),
  },
}));
vi.mock('./photoSync.ts', () => ({ syncPhotos: vi.fn(async () => {}) }));
vi.mock('../sync/syncEvents.ts', () => ({ emitSyncChange: vi.fn() }));
vi.mock('../sync/backgroundSync.ts', () => ({ registerBackgroundSync: vi.fn(async () => {}) }));
vi.mock('./treeRow.ts', () => ({
  fromRow: (row: { client_id: string }) => ({ clientId: row.client_id, id: row.client_id }),
}));
vi.mock('../lib/idb.ts', () => ({
  idbGetAll: (store: 'pending_mutations' | 'pending_photos') => idb.idbGetAll(store),
  idbGet: (store: 'trees_cache', k: string) => idb.idbGet(store, k),
  idbPut: (store: 'trees_cache' | 'pending_mutations', v: never) => idb.idbPut(store, v),
  idbDelete: (store: 'trees_cache' | 'pending_mutations', k: never) => idb.idbDelete(store, k),
}));

const serverRow = { client_id: 'c1' };

const { flush, backoffDelay } = await import('./syncQueue.ts');

const payload: NewTree = {
  clientId: 'c1',
  lon: -34.9,
  lat: -8.05,
  species: 'Syzygium malaccense',
  fruitingStatus: 'none',
  ripeness: 'unknown',
  isShared: false,
};

function seedCreate(clientId: string): void {
  const m: PendingMutation = {
    op: 'create',
    clientId,
    payload: { ...payload, clientId },
    attempts: 0,
    nextAttemptAt: 0,
    enqueuedAt: 0,
  };
  void idb.idbPut('pending_mutations', m);
}

describe('syncQueue.backoffDelay', () => {
  it('grows exponentially from a 2s base', () => {
    expect(backoffDelay(0)).toBe(2000);
    expect(backoffDelay(1)).toBe(4000);
    expect(backoffDelay(2)).toBe(8000);
  });

  it('caps at 5 minutes', () => {
    expect(backoffDelay(8)).toBe(5 * 60 * 1000);
    expect(backoffDelay(20)).toBe(5 * 60 * 1000);
  });
});

describe('syncQueue.flush', () => {
  beforeEach(() => {
    idb.reset();
    rpc.mockClear();
    del.mockClear();
  });

  it('drains pending mutations and clears the queue', async () => {
    seedCreate('c1');

    const result = await flush();

    expect(result.synced).toBe(1);
    expect(result.pending).toBe(0);
    expect(idb.stores.pending_mutations.size).toBe(0);
    expect(idb.stores.trees_cache.has('c1')).toBe(true);
  });

  it('is idempotent: a second flush issues no duplicate server writes', async () => {
    seedCreate('c1');

    await flush();
    await flush();

    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
