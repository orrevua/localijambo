import { createContext } from 'react';

export interface SyncContextValue {
  pending: number;
  lastSyncedAt: number | null;
  syncNow: () => void;
}

export const SyncContext = createContext<SyncContextValue | null>(null);
