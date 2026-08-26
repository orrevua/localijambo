import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flush } from '../data/syncQueue.ts';
import { pendingCount, SYNC_EVENT } from './syncEvents.ts';
import { onBackgroundSyncMessage } from './backgroundSync.ts';
import { SyncContext } from './SyncContext.ts';

export function SyncProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const running = useRef(false);

  const refreshPending = useCallback(() => {
    pendingCount()
      .then(setPending)
      .catch(() => {});
  }, []);

  const syncNow = useCallback(() => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    flush()
      .then((result) => {
        setPending(result.pending);
        if (result.synced > 0) setLastSyncedAt(Date.now());
      })
      .catch(() => {})
      .finally(() => {
        running.current = false;
      });
  }, []);

  useEffect(() => {
    refreshPending();
    if (navigator.onLine) syncNow();

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    window.addEventListener('online', syncNow);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(SYNC_EVENT, refreshPending);
    const offMessage = onBackgroundSyncMessage(syncNow);

    return () => {
      window.removeEventListener('online', syncNow);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SYNC_EVENT, refreshPending);
      offMessage();
    };
  }, [refreshPending, syncNow]);

  const value = useMemo(
    () => ({ pending, lastSyncedAt, syncNow }),
    [pending, lastSyncedAt, syncNow],
  );

  return <SyncContext value={value}>{children}</SyncContext>;
}
