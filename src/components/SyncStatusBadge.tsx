import { useSync } from '../sync/useSync.ts';
import { useI18n } from '../i18n/useI18n.ts';
import styles from './SyncStatusBadge.module.css';

export default function SyncStatusBadge() {
  const { pending, syncing, lastError, forceSync } = useSync();
  const { t } = useI18n();

  if (pending === 0 && !syncing) return null;

  const label = syncing ? t.sync.syncing : t.sync.pending(pending);
  const title = lastError ?? t.sync.pendingTitle(pending);

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
