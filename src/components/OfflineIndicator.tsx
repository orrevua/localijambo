import { useOnlineStatus } from '../sync/useOnlineStatus.ts';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={styles.bar} role="status">
      Offline — changes will sync when you reconnect
    </div>
  );
}
