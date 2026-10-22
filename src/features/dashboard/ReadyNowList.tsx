import type { TreeStatEntry } from '../../lib/treeStats.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import { forecastLabel } from '../../i18n/format.ts';
import TreeLabel from './TreeLabel.tsx';
import styles from './Dashboard.module.css';

export default function ReadyNowList({ entries }: { entries: TreeStatEntry[] }) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return <p className={styles.empty}>{t.dashboard.readyEmpty}</p>;
  }

  return (
    <ul className={styles.readyList}>
      {entries.map(({ tree, prediction, inSeasonNow }) => (
        <li key={tree.id} className={styles.readyRow}>
          <TreeLabel tree={tree} />
          <span className={styles.readyLabel}>{forecastLabel(t, prediction)}</span>
          {inSeasonNow && <span className={styles.seasonBadge}>{t.dashboard.inSeason}</span>}
        </li>
      ))}
    </ul>
  );
}
