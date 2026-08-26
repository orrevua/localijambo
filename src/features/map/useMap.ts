import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

// Recife, NE Brazil — fallback only, used until the device location resolves.
const FALLBACK_CENTER: [number, number] = [-34.9, -8.05];
const FALLBACK_ZOOM = 12;
const LOCATED_ZOOM = 16;

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      // OSM serves tiles only up to z19; cap here so MapLibre overzooms
      // (upscales z19) instead of requesting nonexistent z20 tiles (which
      // return a 400 error page with no CORS header).
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

interface UseMapOptions {
  /** Center on the device's current location on first load (default: true). */
  centerOnUser?: boolean;
}

export function useMap(
  container: RefObject<HTMLDivElement | null>,
  { centerOnUser = true }: UseMapOptions = {},
) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      maxZoom: 19, // OSM has no tiles beyond z19; never request z20
    });

    instance.addControl(new maplibregl.NavigationControl(), 'top-right');

    // trackUserLocation:false → the control recenters once per press (and once
    // on the startup trigger below) instead of continuously following the user.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      fitBoundsOptions: { maxZoom: LOCATED_ZOOM },
    });
    instance.addControl(geolocate, 'top-right');

    instance.once('load', () => {
      setMap(instance);
      // Auto-center on the device location once, exactly like tapping the
      // "locate me" button. Must run after load or trigger() is a no-op.
      if (centerOnUser) {
        try {
          geolocate.trigger();
        } catch {
          /* keep the fallback center */
        }
      }
    });

    return () => {
      instance.remove();
      setMap(null);
    };
  }, [container, centerOnUser]);

  return map;
}
