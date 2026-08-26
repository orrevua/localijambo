import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMap } from './useMap.ts';
import { onMapLongPress } from './mapLongPress.ts';
import { renderTreeMarkers } from './treeMarkers.ts';
import { listVisible } from '../../data/treesRepo.ts';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import { useTreeDetailModal } from '../tree-detail/useTreeDetailModal.ts';
import StateMessage from '../../components/StateMessage.tsx';
import styles from './MapView.module.css';

type Status = 'loading' | 'ready' | 'empty' | 'error';

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useMap(containerRef);
  const { open } = useAddTreeModal();
  const { open: openDetail } = useTreeDetailModal();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!map) return;
    let markers: maplibregl.Marker[] = [];
    let active = true;

    listVisible()
      .then((trees) => {
        if (!active) return;
        markers = renderTreeMarkers(map, trees, (id) => openDetail(id));
        setStatus(trees.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    const detach = onMapLongPress(map, (lngLat) => {
      open({ lon: lngLat.lng, lat: lngLat.lat });
    });

    return () => {
      active = false;
      markers.forEach((m) => m.remove());
      detach();
    };
  }, [map, open, openDetail]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.map} />
      {status === 'empty' && (
        <div className={styles.overlay}>
          <StateMessage
            title="No trees on the map yet"
            detail="Drop the first jambo tree to start mapping."
          >
            <button type="button" className="btn" onClick={() => open()}>
              Add a tree
            </button>
          </StateMessage>
        </div>
      )}
      {status === 'error' && (
        <div className={styles.overlay}>
          <StateMessage
            tone="error"
            title="Could not load trees"
            detail="Check your connection and try again."
          />
        </div>
      )}
    </div>
  );
}
