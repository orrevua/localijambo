import { createContext } from 'react';

export interface TreeDetailModalValue {
  /** Open the tree-detail modal for the given tree id. */
  open: (id: string) => void;
}

export const TreeDetailModalContext = createContext<TreeDetailModalValue | null>(null);
