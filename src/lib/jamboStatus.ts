import type { Tree } from '../types/tree.ts';

/** Coarse visual state of a tree — drives pin colour and status chips. */
export type JamboTone = 'ripe' | 'fruiting' | 'flowering' | 'resting';

export function jamboTone(tree: Pick<Tree, 'fruitingStatus' | 'ripeness'>): JamboTone {
  if (tree.fruitingStatus === 'fruiting') {
    return tree.ripeness === 'ripe' || tree.ripeness === 'overripe' ? 'ripe' : 'fruiting';
  }
  if (tree.fruitingStatus === 'flowering') return 'flowering';
  return 'resting';
}

export const TONE_LABEL: Record<JamboTone, string> = {
  ripe: 'Ripe',
  fruiting: 'Fruiting',
  flowering: 'Flowering',
  resting: 'Resting',
};

export function treeName(tree: Pick<Tree, 'variety' | 'species'>): string {
  const name = tree.variety ?? tree.species;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Great-circle distance in metres. */
export function distanceMeters(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10 || 5} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
