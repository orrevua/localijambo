import { Link, useLocation } from 'react-router';
import { useNavDrawer } from '../features/nav/useNavDrawer.ts';
import { useAuth } from '../auth/useAuth.ts';
import type { LoginState } from '../auth/RequireAuth.tsx';
import Icon from './Icon.tsx';
import { useI18n } from '../i18n/useI18n.ts';
import SyncStatusBadge from './SyncStatusBadge.tsx';
import styles from './Header.module.css';

export default function Header() {
  const { open } = useNavDrawer();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const loginState: LoginState = { from: pathname };

  return (
    <header className={styles.header}>
      <button type="button" className={styles.menu} aria-label={t.nav.openMenu} onClick={open}>
        <Icon name="menu" />
      </button>
      <img className={styles.logo} src="/logo.svg" alt="" width={26} height={26} />
      <span className={styles.wordmark}>localijambo</span>
      <span className={styles.status}>
        {user ? (
          <SyncStatusBadge />
        ) : (
          !loading && (
            <Link to="/login" state={loginState} className={styles.signin}>
              {t.nav.signIn}
            </Link>
          )
        )}
      </span>
    </header>
  );
}
