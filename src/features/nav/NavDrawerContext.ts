import { createContext } from 'react';

export interface NavDrawerValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const NavDrawerContext = createContext<NavDrawerValue | null>(null);
