import { useEffect, useState } from 'react';

export type AccuracyTier = 'green' | 'amber' | 'red';

export interface Fix {
  lon: number;
  lat: number;
  accuracy: number;
  tier: AccuracyTier;
}

export interface WatchPosition {
  fix: Fix | null;
  error: GeolocationPositionError | null;
}

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
};

export function classifyAccuracy(accuracy: number): AccuracyTier {
  if (accuracy <= 15) return 'green';
  if (accuracy <= 40) return 'amber';
  return 'red';
}

export function useWatchPosition(): WatchPosition {
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setFix({
          lon: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
          tier: classifyAccuracy(pos.coords.accuracy),
        });
      },
      (err) => setError(err),
      WATCH_OPTIONS,
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { fix, error };
}
