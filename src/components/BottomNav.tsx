import { NavLink } from 'react-router';
import { useAddTreeModal } from '../features/add-tree/useAddTreeModal.ts';
import Icon from './Icon.tsx';
import { useI18n } from '../i18n/useI18n.ts';
import styles from './BottomNav.module.css';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export default function BottomNav() {
  const { open } = useAddTreeModal();
  const { t } = useI18n();

  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={linkClass}>
        <Icon name="map" />
        <span>{t.nav.map}</span>
      </NavLink>
      <button type="button" className={styles.add} onClick={() => open()} aria-label={t.nav.add}>
        <Icon name="plus" size={26} />
      </button>
      <NavLink to="/list" className={linkClass}>
        <Icon name="list" />
        <span>{t.nav.jambos}</span>
      </NavLink>
    </nav>
  );
}
