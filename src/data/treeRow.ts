import type { Tree } from '../types/tree.ts';

export interface TreeRow {
  id: string;
  client_id: string;
  owner_id: string;
  lon: number;
  lat: number;
  species: string;
  variety: string | null;
  notes: string | null;
  fruiting_status: Tree['fruitingStatus'];
  ripeness: Tree['ripeness'];
  photo_path: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export function fromRow(row: TreeRow): Tree {
  return {
    id: row.id,
    clientId: row.client_id,
    ownerId: row.owner_id,
    lon: row.lon,
    lat: row.lat,
    species: row.species,
    variety: row.variety ?? undefined,
    notes: row.notes ?? undefined,
    fruitingStatus: row.fruiting_status,
    ripeness: row.ripeness,
    photoPath: row.photo_path ?? undefined,
    isShared: row.is_shared,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
