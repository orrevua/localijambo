import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <img className={styles.logo} src="/logo.svg" alt="" width={28} height={28} />
      <span className={styles.wordmark}>Localijambo</span>
    </header>
  );
}
