import { supabase } from '../lib/supabase.ts';
import { idbDelete, idbGetAll, idbGetByClientId, idbPut } from '../lib/idb.ts';
import { emitSyncChange, emitTreesChanged } from '../sync/syncEvents.ts';
import { enqueueMutation, flush } from './syncQueue.ts';
import { queuePhoto } from './photoSync.ts';
import { fromRow, type TreeRow } from './treeRow.ts';
import type { NewTree, Tree } from '../types/tree.ts';

async function currentOwnerId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in.');
  return id;
}

export async function listVisible(): Promise<Tree[]> {
  try {
    const { data, error } = await supabase
      .from('trees_view')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const server = (data as TreeRow[]).map(fromRow);
    await refreshCache(server, () => true);
    return mergePending(server);
  } catch {
    return mergePending(null);
  }
}

/** clientIds with a not-yet-synced create, and those queued for deletion. */
async function pendingSets(): Promise<{ creates: Set<string>; deletes: Set<string> }> {
  const mutations = await idbGetAll('pending_mutations');
  const creates = new Set<string>();
  const deletes = new Set<string>();
  for (const m of mutations) {
    if (m.op === 'delete') deletes.add(m.clientId);
    else if (m.op === 'create') creates.add(m.clientId);
  }
  return { creates, deletes };
}

/**
 * Mirror the server list into the cache: store fresh rows and drop cached
 * trees (within `inScope`) the server no longer returns — deleted or unshared
 * — unless they are still waiting to be created.
 */
async function refreshCache(server: Tree[], inScope: (t: Tree) => boolean): Promise<void> {
  const { creates } = await pendingSets();
  const serverIds = new Set(server.map((t) => t.clientId));
  for (const tree of await idbGetAll('trees_cache')) {
    if (inScope(tree) && !serverIds.has(tree.clientId) && !creates.has(tree.clientId)) {
      await idbDelete('trees_cache', tree.clientId);
    }
  }
  for (const tree of server) await idbPut('trees_cache', tree);
}

/**
 * Combine the server list with local state. `null` (server unreachable) falls
 * back to every cached tree; otherwise only trees still pending creation are
 * added. Trees queued for deletion are always hidden.
 */
export async function mergePending(base: Tree[] | null): Promise<Tree[]> {
  const cached = await idbGetAll('trees_cache');
  const { creates, deletes } = await pendingSets();
  const offline = base === null;
  const byClientId = new Map<string, Tree>();
  for (const tree of base ?? []) byClientId.set(tree.clientId, tree);
  for (const tree of cached) {
    if (byClientId.has(tree.clientId)) continue;
    if (offline || creates.has(tree.clientId)) byClientId.set(tree.clientId, tree);
  }
  for (const clientId of deletes) byClientId.delete(clientId);
  return [...byClientId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listMine(ownerId: string): Promise<Tree[]> {
  try {
    const { data, error } = await supabase
      .from('trees')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const server = (data as TreeRow[]).map(fromRow);
    await refreshCache(server, (t) => t.ownerId === ownerId);
    const merged = await mergePending(server);
    return merged.filter((t) => t.ownerId === ownerId);
  } catch {
    const merged = await mergePending(null);
    return merged.filter((t) => t.ownerId === ownerId);
  }
}

export async function getById(id: string): Promise<Tree | null> {
  try {
    const { data, error } = await supabase
      .from('trees_view')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (data) return fromRow(data as TreeRow);
  } catch {
    // fall through to cache
  }
  const cached = await idbGetAll('trees_cache');
  return cached.find((t) => t.id === id || t.clientId === id) ?? null;
}

export async function create(input: NewTree, photo?: Blob): Promise<Tree> {
  const ownerId = await currentOwnerId();
  const now = new Date().toISOString();
  const optimistic: Tree = {
    id: input.clientId,
    clientId: input.clientId,
    ownerId,
    lon: input.lon,
    lat: input.lat,
    species: input.species,
    variety: input.variety,
    notes: input.notes,
    fruitingStatus: input.fruitingStatus,
    ripeness: input.ripeness,
    photoPath: undefined,
    isShared: input.isShared,
    createdAt: now,
    updatedAt: now,
  };

  await idbPut('trees_cache', optimistic);
  if (photo) await queuePhoto(input.clientId, photo);
  await enqueueMutation({ op: 'create', clientId: input.clientId, payload: input });

  emitTreesChanged();
  if (navigator.onLine) void flush();
  return optimistic;
}

async function findCached(id: string): Promise<Tree | undefined> {
  const cached = await idbGetAll('trees_cache');
  return cached.find((t) => t.id === id || t.clientId === id);
}

export async function setShared(id: string, isShared: boolean): Promise<void> {
  const { error } = await supabase.from('trees').update({ is_shared: isShared }).eq('id', id);
  if (error) throw error;
  const cached = await findCached(id);
  if (cached) await idbPut('trees_cache', { ...cached, isShared });
  emitTreesChanged();
}

/**
 * Record a fresh observation of the tree's fruiting state. The server bumps
 * updated_at, which the season forecast treats as the observation date.
 */
export async function updateStatus(
  id: string,
  fruitingStatus: Tree['fruitingStatus'],
  ripeness: Tree['ripeness'],
): Promise<Tree> {
  const { data, error } = await supabase
    .from('trees')
    .update({ fruiting_status: fruitingStatus, ripeness })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const cached = await findCached(id);
  // The trees table has no owner_name; keep the one trees_view gave us.
  const tree = { ...fromRow(data as TreeRow), ownerName: cached?.ownerName };
  await idbPut('trees_cache', tree);
  emitTreesChanged();
  return tree;
}

export async function remove(id: string): Promise<void> {
  const cached = await findCached(id);
  const clientId = cached?.clientId ?? id;
  const pending = await idbGetByClientId(clientId);
  const neverSynced = pending.some((m) => m.op === 'create');

  if (neverSynced) {
    // The server has never seen it — just drop the queued create + photo.
    for (const m of pending) await idbDelete('pending_mutations', m.id!);
    await idbDelete('pending_photos', clientId);
    emitSyncChange();
  } else if (navigator.onLine) {
    const { error } = await supabase.from('trees').delete().eq('client_id', clientId);
    if (error) throw error;
  } else {
    await enqueueMutation({ op: 'delete', clientId, payload: {} });
  }

  await idbDelete('trees_cache', clientId);
  emitTreesChanged();
}
