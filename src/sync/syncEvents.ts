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
