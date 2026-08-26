import { useNavDrawer } from '../features/nav/useNavDrawer.ts';
import styles from './Header.module.css';

export default function Header() {
  const { open } = useNavDrawer();

  return (
    <header className={styles.header}>
      <button type="button" className={styles.menu} aria-label="Open menu" onClick={open}>
        <span className={styles.bars} aria-hidden="true" />
      </button>
      <img className={styles.logo} src="/logo.svg" alt="" width={28} height={28} />
      <span className={styles.wordmark}>Localijambo</span>
    </header>
  );
}
