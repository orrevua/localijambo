import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import { NavDrawerContext } from './NavDrawerContext.ts';
import type { NavDrawerValue } from './NavDrawerContext.ts';
import styles from './NavDrawer.module.css';

const LINKS = [
  { to: '/', label: 'Map', end: true },
  { to: '/list', label: 'Trees', end: false },
  { to: '/dashboard', label: 'Dashboard', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<NavDrawerValue>(() => ({ isOpen, open, close }), [isOpen, open, close]);

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
    <NavDrawerContext value={value}>
      {children}
      {isOpen && (
        <div className={styles.backdrop} onClick={close}>
          <aside
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className={styles.links}>
              {LINKS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={close}
                  className={({ isActive }) =>
                    isActive ? `${styles.link} ${styles.active}` : styles.link
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className={styles.signout}
              onClick={() => {
                close();
                void signOut();
              }}
            >
              Sign out
            </button>
          </aside>
        </div>
      )}
    </NavDrawerContext>
  );
}
