import { use } from 'react';
import { NavDrawerContext } from './NavDrawerContext.ts';

export function useNavDrawer() {
  const value = use(NavDrawerContext);
  if (!value) {
    throw new Error('useNavDrawer must be used within a NavDrawerProvider');
  }
  return value;
}
