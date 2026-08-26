import { createContext } from 'react';

export interface AddTreeCoords {
  lon: number;
  lat: number;
}

export interface AddTreeModalValue {
  /** Open the add-tree modal, optionally pre-seeded with a dropped location. */
  open: (coords?: AddTreeCoords) => void;
}

export const AddTreeModalContext = createContext<AddTreeModalValue | null>(null);
