import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flush, resetBackoff } from '../data/syncQueue.ts';
import { pendingCount, SYNC_EVENT } from './syncEvents.ts';
import { onBackgroundSyncMessage } from './backgroundSync.ts';
import { SyncContext } from './SyncContext.ts';

export function SyncProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const running = useRef(false);

  const refreshPending = useCallback(() => {
    pendingCount()
      .then(setPending)
      .catch(() => {});
  }, []);

  const runFlush = useCallback(async () => {
    if (running.current) return;
    if (!navigator.onLine) {
      setLastError("You're offline — changes will sync when you reconnect.");
      return;
    }
    running.current = true;
    setSyncing(true);
    setLastError(null);
    try {
      const result = await flush();
      setPending(result.pending);
      if (result.synced > 0) setLastSyncedAt(Date.now());
      if (result.failed > 0 && result.pending > 0) {
        setLastError('Some changes could not sync yet. They will retry.');
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, []);

  const syncNow = useCallback(() => {
    void runFlush();
  }, [runFlush]);

  const forceSync = useCallback(() => {
    void resetBackoff().then(runFlush);
  }, [runFlush]);

  useEffect(() => {
    refreshPending();
    if (navigator.onLine) queueMicrotask(syncNow);

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
    () => ({ pending, lastSyncedAt, syncing, lastError, syncNow, forceSync }),
    [pending, lastSyncedAt, syncing, lastError, syncNow, forceSync],
  );

  return <SyncContext value={value}>{children}</SyncContext>;
}
