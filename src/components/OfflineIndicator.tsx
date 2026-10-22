import { useOnlineStatus } from '../sync/useOnlineStatus.ts';
import { useI18n } from '../i18n/useI18n.ts';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const { t } = useI18n();
  if (online) return null;
  return (
    <div className={styles.bar} role="status">
      {t.sync.offline}
    </div>
  );
}
