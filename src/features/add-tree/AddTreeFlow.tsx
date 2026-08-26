import { useState } from 'react';
import LiveGpsCapture from './LiveGpsCapture.tsx';
import ManualDrop from './ManualDrop.tsx';
import TreeForm from './TreeForm.tsx';
import type { AddTreeCoords } from './AddTreeModalContext.ts';
import styles from './AddTreeScreen.module.css';

type Mode = 'live' | 'manual';

interface Props {
  /** Pre-seeded location from a map long-press; jumps straight to the form. */
  initialCoords?: AddTreeCoords | null;
  /** Called after the tree is saved so the host can close the modal. */
  onCreated: () => void;
}

export default function AddTreeFlow({ initialCoords, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>(initialCoords ? 'manual' : 'live');
  const [coords, setCoords] = useState<AddTreeCoords | null>(initialCoords ?? null);

  if (coords) {
    return (
      <div className={styles.screen}>
        <h2 className={styles.title}>Tree details</h2>
        <p className={styles.coords}>
          {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
        </p>
        <TreeForm lon={coords.lon} lat={coords.lat} onCreated={onCreated} />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Add tree</h2>
      <div className={styles.modes} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'live'}
          className={`${styles.mode} ${mode === 'live' ? styles.active : ''}`}
          onClick={() => setMode('live')}
        >
          Live GPS
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          className={`${styles.mode} ${mode === 'manual' ? styles.active : ''}`}
          onClick={() => setMode('manual')}
        >
          Manual drop
        </button>
      </div>
      {mode === 'live' ? (
        <LiveGpsCapture
          onCapture={(lon, lat) => setCoords({ lon, lat })}
          onManualDrop={() => setMode('manual')}
        />
      ) : (
        <ManualDrop onConfirm={(lon, lat) => setCoords({ lon, lat })} />
      )}
    </div>
  );
}
