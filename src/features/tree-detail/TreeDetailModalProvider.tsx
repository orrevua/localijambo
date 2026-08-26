import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import TreeDetail from './TreeDetail.tsx';
import { TreeDetailModalContext } from './TreeDetailModalContext.ts';
import type { TreeDetailModalValue } from './TreeDetailModalContext.ts';
import styles from './TreeDetailModal.module.css';

export function TreeDetailModalProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const close = useCallback(() => setOpenId(null), []);

  const value = useMemo<TreeDetailModalValue>(() => ({ open: (id) => setOpenId(id) }), []);

  useEffect(() => {
    if (!openId) return;
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
  }, [openId, close]);

  return (
    <TreeDetailModalContext value={value}>
      {children}
      {openId && (
        <div className={styles.backdrop} onClick={close}>
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Tree details"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.close} aria-label="Close" onClick={close}>
              ×
            </button>
            <TreeDetail key={openId} id={openId} onDeleted={close} />
          </div>
        </div>
      )}
    </TreeDetailModalContext>
  );
}
