import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Sheet from '../../components/Sheet.tsx';
import TreeDetail from './TreeDetail.tsx';
import { TreeDetailModalContext } from './TreeDetailModalContext.ts';
import type { TreeDetailModalValue } from './TreeDetailModalContext.ts';

export function TreeDetailModalProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const close = useCallback(() => setOpenId(null), []);

  const value = useMemo<TreeDetailModalValue>(() => ({ open: (id) => setOpenId(id) }), []);

  return (
    <TreeDetailModalContext value={value}>
      {children}
      {openId && (
        <Sheet label="Jambo details" onClose={close}>
          <TreeDetail key={openId} id={openId} onDeleted={close} onShowOnMap={close} />
        </Sheet>
      )}
    </TreeDetailModalContext>
  );
}
