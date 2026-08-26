import { supabase } from '../lib/supabase.ts';
import { idbGetAll, idbPut } from '../lib/idb.ts';
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
    for (const tree of server) await idbPut('trees_cache', tree);
    return mergePending(server);
  } catch {
    const cached = await idbGetAll('trees_cache');
    return mergePending(cached);
  }
}

export async function mergePending(base: Tree[]): Promise<Tree[]> {
  const cached = await idbGetAll('trees_cache');
  const byClientId = new Map<string, Tree>();
  for (const tree of base) byClientId.set(tree.clientId, tree);
  for (const tree of cached) {
    if (!byClientId.has(tree.clientId)) byClientId.set(tree.clientId, tree);
  }
  return [...byClientId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  if (navigator.onLine) void flush();
  return optimistic;
}

export async function setShared(id: string, isShared: boolean): Promise<void> {
  const { error } = await supabase.from('trees').update({ is_shared: isShared }).eq('id', id);
  if (error) throw error;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('trees').delete().eq('id', id);
  if (error) throw error;
}
