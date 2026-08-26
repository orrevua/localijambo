import { use } from 'react';
import { SyncContext } from './SyncContext.ts';

export function useSync() {
  const value = use(SyncContext);
  if (!value) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return value;
}
