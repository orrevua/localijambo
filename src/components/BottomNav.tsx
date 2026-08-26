import { NavLink } from 'react-router';
import { useAddTreeModal } from '../features/add-tree/useAddTreeModal.ts';
import styles from './BottomNav.module.css';

const links = [
  { to: '/', label: 'Map' },
  { to: '/list', label: 'List' },
];

export default function BottomNav() {
  const { open } = useAddTreeModal();

  return (
    <nav className={styles.nav}>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          {label}
        </NavLink>
      ))}
      <button type="button" className={`${styles.link} ${styles.addButton}`} onClick={() => open()}>
        Add +
      </button>
    </nav>
  );
}
