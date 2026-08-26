import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './StateMessage.module.css';

type Tone = 'neutral' | 'error';

interface Props {
  title: string;
  detail?: string;
  tone?: Tone;
  action?: { to: string; label: string };
  children?: ReactNode;
}

export default function StateMessage({ title, detail, tone = 'neutral', action, children }: Props) {
  return (
    <div className={`${styles.wrap} ${tone === 'error' ? styles.error : ''}`} role="status">
      <p className={styles.title}>{title}</p>
      {detail && <p className={styles.detail}>{detail}</p>}
      {action && (
        <Link className={styles.action} to={action.to}>
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
