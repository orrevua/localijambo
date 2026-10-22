import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import { useInstallPrompt } from '../../pwa/useInstallPrompt.ts';
import Icon from '../../components/Icon.tsx';
import LanguageToggle from '../../components/LanguageToggle.tsx';
import { useI18n } from '../../i18n/useI18n.ts';
import { NavDrawerContext } from './NavDrawerContext.ts';
import type { NavDrawerValue } from './NavDrawerContext.ts';
import styles from './NavDrawer.module.css';

const LINKS = [
  { to: '/', key: 'map', end: true, auth: false },
  { to: '/list', key: 'jambos', end: false, auth: false },
  { to: '/dashboard', key: 'dashboard', end: false, auth: true },
  { to: '/profile', key: 'profile', end: false, auth: true },
] as const;

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const install = useInstallPrompt();
  const { t } = useI18n();
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
            aria-label={t.nav.menu}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.brand}>
              <img src="/logo.svg" alt="" width={36} height={36} />
              <div>
                <p className={styles.brandName}>localijambo</p>
                {user?.email && <p className={styles.email}>{user.email}</p>}
              </div>
            </div>
            <nav className={styles.links}>
              {LINKS.filter((l) => user || !l.auth).map(({ to, key, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={close}
                  className={({ isActive }) =>
                    isActive ? `${styles.link} ${styles.active}` : styles.link
                  }
                >
                  {t.nav[key]}
                </NavLink>
              ))}
            </nav>
            <div className={styles.lang}>
              <span>{t.common.language}</span>
              <LanguageToggle />
            </div>
            {install.mode === 'prompt' && (
              <button
                type="button"
                className={styles.install}
                onClick={() => void install.install()}
              >
                <Icon name="download" size={20} />
                {t.nav.install}
              </button>
            )}
            {install.mode === 'ios' && (
              <p className={styles.iosHint}>{t.nav.iosInstall(t.nav.iosShare, t.nav.iosAdd)}</p>
            )}
            {user ? (
              <button
                type="button"
                className={styles.signout}
                onClick={() => {
                  close();
                  void signOut();
                }}
              >
                {t.nav.signOut}
              </button>
            ) : (
              <Link to="/login" onClick={close} className={`btn ${styles.signin}`}>
                {t.nav.signIn}
              </Link>
            )}
          </aside>
        </div>
      )}
    </NavDrawerContext>
  );
}
