import { useEffect, useState } from 'react';
import { pendingCount, SYNC_EVENT } from '../sync/syncEvents.ts';
import styles from './SyncStatusBadge.module.css';

export default function SyncStatusBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      pendingCount()
        .then((n) => {
          if (active) setCount(n);
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className={styles.badge} title={`${count} change(s) waiting to sync`}>
      {count} pending
    </span>
  );
}
