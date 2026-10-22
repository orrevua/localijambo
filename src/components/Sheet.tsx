import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Icon from './Icon.tsx';
import { useI18n } from '../i18n/useI18n.ts';
import styles from './Sheet.module.css';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet on phones, centered card on wider screens. */
export default function Sheet({ label, onClose, children }: Props) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <button type="button" className={styles.close} aria-label={t.common.close} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
