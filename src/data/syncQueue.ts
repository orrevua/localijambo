import { supabase } from '../lib/supabase.ts';
import { idbDelete, idbGetAll, idbPut } from '../lib/idb.ts';
import type { PendingMutation } from '../lib/idb.ts';
import { emitSyncChange } from '../sync/syncEvents.ts';
import { registerBackgroundSync } from '../sync/backgroundSync.ts';
import { syncPhotos } from './photoSync.ts';
import { fromRow, type TreeRow } from './treeRow.ts';
import type { Tree } from '../types/tree.ts';

const BACKOFF_BASE_MS = 2000;
const BACKOFF_CAP_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}

export async function enqueueMutation(
  mutation: Omit<PendingMutation, 'attempts' | 'nextAttemptAt' | 'enqueuedAt'>,
): Promise<void> {
  const now = Date.now();
  await idbPut('pending_mutations', {
    ...mutation,
    attempts: 0,
    nextAttemptAt: now,
    enqueuedAt: now,
  });
  emitSyncChange();
  void registerBackgroundSync();
}

export function backoffDelay(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempts, BACKOFF_CAP_MS);
}

async function pushMutation(mutation: PendingMutation): Promise<Tree | null> {
  if (mutation.op === 'delete') {
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('client_id', mutation.clientId);
    if (error) throw error;
    return null;
  }
  const p = mutation.payload;
  const { data, error } = await supabase
    .rpc('upsert_tree', {
      p_client_id: mutation.clientId,
      p_lon: p.lon,
      p_lat: p.lat,
      p_species: p.species,
      p_variety: p.variety ?? null,
      p_notes: p.notes ?? null,
      p_fruiting_status: p.fruitingStatus,
      p_ripeness: p.ripeness,
      p_is_shared: p.isShared,
    })
    .single();
  if (error) throw error;
  return fromRow(data as TreeRow);
}

let flushing = false;

export async function flush(): Promise<SyncResult> {
  if (flushing) return { synced: 0, failed: 0, pending: 0 };
  flushing = true;
  try {
    const mutations = (await idbGetAll('pending_mutations')).sort(
      (a, b) => (a.id ?? 0) - (b.id ?? 0),
    );
    const now = Date.now();
    let synced = 0;
    let failed = 0;

    for (const mutation of mutations) {
      if (mutation.nextAttemptAt > now) continue;
      try {
        const tree = await pushMutation(mutation);
        if (tree) await idbPut('trees_cache', tree);
        else await removeCachedTree(mutation.clientId);
        await idbDelete('pending_mutations', mutation.id!);
        synced += 1;
      } catch (err) {
        const attempts = mutation.attempts + 1;
        failed += 1;
        await idbPut('pending_mutations', {
          ...mutation,
          attempts,
          nextAttemptAt: Date.now() + backoffDelay(attempts),
          lastError: err instanceof Error ? err.message : String(err),
        });
        if (attempts >= MAX_ATTEMPTS) continue;
      }
    }

    await syncPhotos();

    const remaining = await idbGetAll('pending_mutations');
    const photos = await idbGetAll('pending_photos');
    emitSyncChange();
    return { synced, failed, pending: remaining.length + photos.length };
  } finally {
    flushing = false;
  }
}

async function removeCachedTree(clientId: string): Promise<void> {
  await idbDelete('trees_cache', clientId);
}
