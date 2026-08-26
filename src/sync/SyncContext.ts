import { createContext } from 'react';

export interface SyncContextValue {
  pending: number;
  lastSyncedAt: number | null;
  syncing: boolean;
  lastError: string | null;
  syncNow: () => void;
  /** User-triggered: clears backoff and flushes immediately. */
  forceSync: () => void;
}

export const SyncContext = createContext<SyncContextValue | null>(null);
