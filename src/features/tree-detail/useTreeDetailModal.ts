import { use } from 'react';
import { TreeDetailModalContext } from './TreeDetailModalContext.ts';

export function useTreeDetailModal() {
  const value = use(TreeDetailModalContext);
  if (!value) {
    throw new Error('useTreeDetailModal must be used within a TreeDetailModalProvider');
  }
  return value;
}
