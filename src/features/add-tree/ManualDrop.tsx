import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMap } from '../map/useMap.ts';
import { onMapLongPress } from '../map/mapLongPress.ts';
import { applyJamboPin } from '../map/jamboPin.ts';
import styles from './ManualDrop.module.css';

interface Props {
  onConfirm: (lon: number, lat: number) => void;
}

export default function ManualDrop({ onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map } = useMap(containerRef);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [picked, setPicked] = useState<{ lon: number; lat: number } | null>(null);

  useEffect(() => {
    if (!map) return;

    function place(lngLat: maplibregl.LngLat) {
      if (!map) return;
      if (markerRef.current) {
        markerRef.current.setLngLat(lngLat);
      } else {
        const el = document.createElement('div');
        applyJamboPin(el);
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
          .setLngLat(lngLat)
          .addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLngLat();
          setPicked({ lon: p.lng, lat: p.lat });
        });
        markerRef.current = marker;
      }
      setPicked({ lon: lngLat.lng, lat: lngLat.lat });
    }

    const detach = onMapLongPress(map, place);

    return () => {
      detach();
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.map} />
      {!picked && (
        <div className={styles.hint} role="status">
          Right-click or press &amp; hold on the map to place the tree
        </div>
      )}
      {picked && (
        <p className={styles.coords}>
          {picked.lat.toFixed(6)}, {picked.lon.toFixed(6)} · drag the pin to adjust
        </p>
      )}
      <button
        className={`btn ${styles.confirm}`}
        type="button"
        disabled={!picked}
        onClick={() => picked && onConfirm(picked.lon, picked.lat)}
      >
        Confirm location
      </button>
    </div>
  );
}
