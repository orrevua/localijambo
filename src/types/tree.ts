export type FruitingStatus = 'none' | 'flowering' | 'fruiting';
export type Ripeness = 'unknown' | 'unripe' | 'ripening' | 'ripe' | 'overripe';

export interface Tree {
  id: string;
  clientId: string;
  ownerId: string;
  lon: number;
  lat: number;
  species: string;
  variety?: string;
  notes?: string;
  fruitingStatus: FruitingStatus;
  ripeness: Ripeness;
  photoPath?: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewTree = Pick<
  Tree,
  'clientId' | 'lon' | 'lat' | 'species' | 'variety' | 'notes' | 'fruitingStatus' | 'ripeness' | 'isShared'
>;
