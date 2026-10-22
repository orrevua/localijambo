import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import maplibregl from 'maplibre-gl';

// Recife, NE Brazil — fallback only, used until the device location resolves.
const FALLBACK_CENTER: [number, number] = [-34.9, -8.05];
const FALLBACK_ZOOM = 12;
const LOCATED_ZOOM = 16;

// OpenFreeMap Positron: free, keyless, unlimited vector basemap built on
// OpenStreetMap — quiet and near-monochrome so the pastel pins stand out.
// The style carries its own attribution.
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

interface UseMapOptions {
  /** Center on the device's current location on first load (default: true). */
  centerOnUser?: boolean;
}

export interface UseMapResult {
  map: maplibregl.Map | null;
  /** True until the initial device-location lookup resolves (success or fail). */
  locating: boolean;
  /** Device location from the startup lookup, if it succeeded. */
  userPos: UserPosition | null;
}

export interface UserPosition {
  lon: number;
  lat: number;
}

export function useMap(
  container: RefObject<HTMLDivElement | null>,
  { centerOnUser = true }: UseMapOptions = {},
): UseMapResult {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [locating, setLocating] = useState(centerOnUser && 'geolocation' in navigator);
  const [userPos, setUserPos] = useState<UserPosition | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
      style: BASEMAP_STYLE,
      attributionControl: { compact: true },
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      maxZoom: 19,
    });

    const canLocate = centerOnUser && 'geolocation' in navigator;

    instance.once('load', () => {
      setMap(instance);
      if (!canLocate) {
        setLocating(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          instance.jumpTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: LOCATED_ZOOM,
          });
          setUserPos({ lon: pos.coords.longitude, lat: pos.coords.latitude });
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

  return { map, locating, userPos };
}
