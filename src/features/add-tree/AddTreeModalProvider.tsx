import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AddTreeFlow from './AddTreeFlow.tsx';
import { AddTreeModalContext } from './AddTreeModalContext.ts';
import type { AddTreeCoords, AddTreeModalValue } from './AddTreeModalContext.ts';
import styles from './AddTreeModal.module.css';

export function AddTreeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<AddTreeCoords | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setCoords(null);
  }, []);

  const value = useMemo<AddTreeModalValue>(
    () => ({
      open: (c) => {
        setCoords(c ?? null);
        setIsOpen(true);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  return (
    <AddTreeModalContext value={value}>
      {children}
      {isOpen && (
        <div className={styles.backdrop} onClick={close}>
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Add a tree"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.close} aria-label="Close" onClick={close}>
              ×
            </button>
            {/* key forces a fresh flow each time the modal opens */}
            <AddTreeFlow key={coords ? `${coords.lon},${coords.lat}` : 'blank'} initialCoords={coords} onCreated={close} />
          </div>
        </div>
      )}
    </AddTreeModalContext>
  );
}
