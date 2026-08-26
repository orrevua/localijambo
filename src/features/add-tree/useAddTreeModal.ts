import { use } from 'react';
import { AddTreeModalContext } from './AddTreeModalContext.ts';

export function useAddTreeModal() {
  const value = use(AddTreeModalContext);
  if (!value) {
    throw new Error('useAddTreeModal must be used within an AddTreeModalProvider');
  }
  return value;
}
