import { idbGetAll } from '../lib/idb.ts';

export const SYNC_EVENT = 'localijambo:sync';

export function emitSyncChange(): void {
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export async function pendingCount(): Promise<number> {
  const [mutations, photos] = await Promise.all([
    idbGetAll('pending_mutations'),
    idbGetAll('pending_photos'),
  ]);
  return mutations.length + photos.length;
}

/** Fired whenever the set of trees (or their fields) changes locally or after a sync. */
export const TREES_EVENT = 'localijambo:trees';

export function emitTreesChanged(): void {
  window.dispatchEvent(new Event(TREES_EVENT));
}

/** Subscribe to tree changes. Returns an unsubscribe function. */
export function onTreesChanged(run: () => void): () => void {
  window.addEventListener(TREES_EVENT, run);
  return () => window.removeEventListener(TREES_EVENT, run);
}
