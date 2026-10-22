import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Sheet from '../../components/Sheet.tsx';
import TreeForm from './TreeForm.tsx';
import { AddTreeModalContext } from './AddTreeModalContext.ts';
import type { AddTreeCoords, AddTreeModalValue } from './AddTreeModalContext.ts';
import styles from './AddTreeSheet.module.css';

export function AddTreeModalProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [coords, setCoords] = useState<AddTreeCoords | null>(null);
  const [placing, setPlacing] = useState(false);

  // Leaving the map abandons pin placement (state adjusted during render).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (pathname !== '/') setPlacing(false);
  }

  const close = useCallback(() => setCoords(null), []);
  const cancelPlacing = useCallback(() => setPlacing(false), []);

  const open = useCallback(
    (c?: AddTreeCoords) => {
      if (c) {
        setPlacing(false);
        setCoords(c);
        return;
      }
      setPlacing(true);
      if (pathname !== '/') navigate('/');
    },
    [navigate, pathname],
  );

  const value = useMemo<AddTreeModalValue>(
    () => ({ open, placing, cancelPlacing }),
    [open, placing, cancelPlacing],
  );

  return (
    <AddTreeModalContext value={value}>
      {children}
      {coords && (
        <Sheet label="Add a jambo" onClose={close}>
          <div className={styles.screen}>
            <header className={styles.head}>
              <h2 className={styles.title}>New jambo</h2>
              <p className={styles.coords}>
                {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              </p>
            </header>
            <TreeForm
              lon={coords.lon}
              lat={coords.lat}
              onCreated={() => {
                close();
                // Land on the map, centred on the new jambo.
                navigate('/', { state: { focus: coords } });
              }}
            />
          </div>
        </Sheet>
      )}
    </AddTreeModalContext>
  );
}
