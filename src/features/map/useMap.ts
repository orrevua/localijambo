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

export interface UseMapResult {
  map: maplibregl.Map | null;
  /** True until the initial device-location lookup resolves (success or fail). */
  locating: boolean;
}

export function useMap(
  container: RefObject<HTMLDivElement | null>,
  { centerOnUser = true }: UseMapOptions = {},
): UseMapResult {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [locating, setLocating] = useState(centerOnUser && 'geolocation' in navigator);

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

    // trackUserLocation:false → the button recenters once per press instead of
    // continuously following the user.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      fitBoundsOptions: { maxZoom: LOCATED_ZOOM },
    });
    instance.addControl(geolocate, 'top-right');

    const canLocate = centerOnUser && 'geolocation' in navigator;

    instance.once('load', () => {
      setMap(instance);
      if (!canLocate) {
        setLocating(false);
        return;
      }
      // Center via the geolocation API directly — deterministic, unlike
      // GeolocateControl.trigger() which can no-op if fired before it's ready.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          instance.jumpTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: LOCATED_ZOOM,
          });
          setLocating(false);
        },
        () => setLocating(false), // denied/timeout → keep the fallback center
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    });

    return () => {
      instance.remove();
      setMap(null);
    };
  }, [container, centerOnUser]);

  return { map, locating };
}
