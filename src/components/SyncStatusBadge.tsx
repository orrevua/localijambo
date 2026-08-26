import { useSync } from '../sync/useSync.ts';
import styles from './SyncStatusBadge.module.css';

export default function SyncStatusBadge() {
  const { pending, syncing, lastError, forceSync } = useSync();

  if (pending === 0 && !syncing) return null;

  const label = syncing ? 'Syncing…' : `${pending} pending · Sync now`;
  const title = lastError ?? `${pending} change(s) waiting to sync — tap to sync now`;

  return (
    <button
      type="button"
      className={`${styles.badge} ${lastError ? styles.error : ''}`}
      onClick={forceSync}
      disabled={syncing}
      title={title}
      aria-label={title}
    >
      {syncing && <span className={styles.spinner} aria-hidden="true" />}
      {label}
    </button>
  );
}
