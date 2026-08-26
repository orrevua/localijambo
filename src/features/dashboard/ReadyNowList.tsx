import { Link } from 'react-router';
import type { TreeStatEntry } from '../../lib/treeStats.ts';
import styles from './Dashboard.module.css';

export default function ReadyNowList({ entries }: { entries: TreeStatEntry[] }) {
  if (entries.length === 0) {
    return <p className={styles.empty}>Nothing ripe right now — check the timeline below.</p>;
  }

  return (
    <ul className={styles.readyList}>
      {entries.map(({ tree, prediction, inSeasonNow }) => (
        <li key={tree.id}>
          <Link className={styles.readyRow} to={`/tree/${tree.id}`}>
            <span className={styles.readyName}>{tree.variety ?? tree.species}</span>
            <span className={styles.readyLabel}>{prediction.label}</span>
            {inSeasonNow && <span className={styles.seasonBadge}>in season</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
