import maplibregl from 'maplibre-gl';
import type { Tree } from '../../types/tree.ts';

const CRIMSON = '#c21030';

export function renderTreeMarkers(
  map: maplibregl.Map,
  trees: Tree[],
  onSelect: (id: string) => void,
): maplibregl.Marker[] {
  return trees.map((tree) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', tree.species);
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.border = '2px solid #fff';
    el.style.borderRadius = '50%';
    el.style.background = CRIMSON;
    el.style.cursor = 'pointer';
    el.style.padding = '0';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(tree.id);
    });

    return new maplibregl.Marker({ element: el }).setLngLat([tree.lon, tree.lat]).addTo(map);
  });
}
