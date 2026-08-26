import { supabase } from '../lib/supabase.ts';
import { idbDelete, idbGet, idbGetAll, idbGetByClientId, idbPut } from '../lib/idb.ts';

const BUCKET = 'tree-photos';

export function photoPath(ownerId: string, clientId: string): string {
  return `${ownerId}/${clientId}.jpg`;
}

export async function queuePhoto(clientId: string, blob: Blob): Promise<void> {
  await idbPut('pending_photos', { clientId, blob, contentType: 'image/jpeg' });
}

async function patchPhotoPath(clientId: string, path: string): Promise<void> {
  const { error } = await supabase
    .from('trees')
    .update({ photo_path: path })
    .eq('client_id', clientId);
  if (error) throw error;
}

export async function syncPhotos(): Promise<void> {
  const photos = await idbGetAll('pending_photos');
  for (const photo of photos) {
    const tree = await idbGet('trees_cache', photo.clientId);
    // Only upload once the tree row exists server-side (no pending create mutation).
    if (!tree) continue;
    const pending = await idbGetByClientId(photo.clientId);
    if (pending.some((m) => m.op === 'create')) continue;

    const path = photoPath(tree.ownerId, photo.clientId);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, photo.blob, {
        contentType: photo.contentType,
        upsert: true,
      });
      if (error) throw error;
      await patchPhotoPath(photo.clientId, path);
      await idbPut('trees_cache', { ...tree, photoPath: path });
      await idbDelete('pending_photos', photo.clientId);
    } catch {
      // keep blob; retried on next flush
    }
  }
}
