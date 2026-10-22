import { createContext } from 'react';

export interface AddTreeCoords {
  lon: number;
  lat: number;
}

export interface AddTreeModalValue {
  /**
   * Start adding a jambo. With coords, opens the details form directly;
   * without, switches the map into "place the pin" mode.
   */
  open: (coords?: AddTreeCoords) => void;
  /** True while the map is in pin-placement mode. */
  placing: boolean;
  cancelPlacing: () => void;
}

export const AddTreeModalContext = createContext<AddTreeModalValue | null>(null);
