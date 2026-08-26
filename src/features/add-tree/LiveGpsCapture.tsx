import { useWatchPosition } from '../../lib/geo.ts';
import styles from './LiveGpsCapture.module.css';

interface Props {
  onCapture: (lon: number, lat: number) => void;
  onManualDrop: () => void;
}

export default function LiveGpsCapture({ onCapture, onManualDrop }: Props) {
  const { fix, error } = useWatchPosition();

  const denied = error?.code === 1;

  if (denied) {
    return (
      <div className={styles.capture}>
        <p className={styles.error}>
          Location permission was denied. You can still place the tree manually.
        </p>
        <button className="btn" type="button" onClick={onManualDrop}>
          Switch to Manual drop
        </button>
      </div>
    );
  }

  return (
    <div className={styles.capture}>
      {fix ? (
        <div className={styles.readout}>
          <span className={`${styles.badge} ${styles[fix.tier]}`}>±{Math.round(fix.accuracy)} m</span>
          <span className={styles.coords}>
            {fix.lat.toFixed(6)}, {fix.lon.toFixed(6)}
          </span>
        </div>
      ) : (
        <p className={styles.waiting}>{error ? 'Waiting for a GPS fix…' : 'Acquiring location…'}</p>
      )}
      {fix && fix.tier === 'red' && (
        <p className={styles.warn}>Accuracy is low. Move to open sky or drop the tree manually.</p>
      )}
      <button
        className="btn"
        type="button"
        disabled={!fix}
        onClick={() => fix && onCapture(fix.lon, fix.lat)}
      >
        Capture here
      </button>
    </div>
  );
}
