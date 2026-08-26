import maplibregl from 'maplibre-gl';
import type { Tree } from '../../types/tree.ts';
import { applyJamboPin } from './jamboPin.ts';

export function renderTreeMarkers(
  map: maplibregl.Map,
  trees: Tree[],
  onSelect: (id: string) => void,
): maplibregl.Marker[] {
  return trees.map((tree) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', tree.variety ?? tree.species);
    el.style.border = 'none';
    el.style.background = 'none';
    el.style.padding = '0';
    applyJamboPin(el);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(tree.id);
    });

    return new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([tree.lon, tree.lat])
      .addTo(map);
  });
}
