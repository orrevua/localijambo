// In-memory stand-in for src/lib/idb.ts used by unit tests.
// Mirrors the exported surface without touching real IndexedDB.
import type { PendingMutation, PendingPhoto } from '../lib/idb.ts';
import type { Tree } from '../types/tree.ts';

type Stores = {
  trees_cache: Map<string, Tree>;
  pending_mutations: Map<number, PendingMutation>;
  pending_photos: Map<string, PendingPhoto>;
};

export function createIdbMock() {
  const stores: Stores = {
    trees_cache: new Map(),
    pending_mutations: new Map(),
    pending_photos: new Map(),
  };
  let autoId = 0;

  return {
    stores,
    reset() {
      stores.trees_cache.clear();
      stores.pending_mutations.clear();
      stores.pending_photos.clear();
      autoId = 0;
    },
    async idbPut(store: keyof Stores, value: Tree | PendingMutation | PendingPhoto) {
      if (store === 'pending_mutations') {
        const m = value as PendingMutation;
        const id = m.id ?? ++autoId;
        stores.pending_mutations.set(id, { ...m, id });
        return id;
      }
      if (store === 'trees_cache') {
        const t = value as Tree;
        stores.trees_cache.set(t.clientId, t);
        return t.clientId;
      }
      const p = value as PendingPhoto;
      stores.pending_photos.set(p.clientId, p);
      return p.clientId;
    },
    async idbGet(store: keyof Stores, key: string | number) {
      return (stores[store] as Map<string | number, unknown>).get(key);
    },
    async idbGetAll(store: keyof Stores) {
      return [...(stores[store] as Map<unknown, unknown>).values()];
    },
    async idbDelete(store: keyof Stores, key: string | number) {
      (stores[store] as Map<string | number, unknown>).delete(key);
    },
    async idbGetByClientId(clientId: string) {
      return [...stores.pending_mutations.values()].filter((m) => m.clientId === clientId);
    },
  };
}
