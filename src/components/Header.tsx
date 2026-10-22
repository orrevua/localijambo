import { useNavDrawer } from '../features/nav/useNavDrawer.ts';
import Icon from './Icon.tsx';
import SyncStatusBadge from './SyncStatusBadge.tsx';
import styles from './Header.module.css';

export default function Header() {
  const { open } = useNavDrawer();

  return (
    <header className={styles.header}>
      <button type="button" className={styles.menu} aria-label="Open menu" onClick={open}>
        <Icon name="menu" />
      </button>
      <img className={styles.logo} src="/logo.svg" alt="" width={26} height={26} />
      <span className={styles.wordmark}>localijambo</span>
      <span className={styles.status}>
        <SyncStatusBadge />
      </span>
    </header>
  );
}
