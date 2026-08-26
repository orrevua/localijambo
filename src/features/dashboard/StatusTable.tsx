import { humanizeDays } from '../../lib/phenology.ts';
import type { TreeStatEntry } from '../../lib/treeStats.ts';
import styles from './Dashboard.module.css';

function ripeRange(entry: TreeStatEntry): string {
  const { daysToRipeMin, daysToRipeMax } = entry.prediction;
  if (daysToRipeMin === 0 && daysToRipeMax === 0) return 'now';
  if (daysToRipeMin === daysToRipeMax) return humanizeDays(daysToRipeMin);
  return `${daysToRipeMin}–${daysToRipeMax} d`;
}

function lastObserved(entry: TreeStatEntry): string {
  if (entry.lastObservedDays === null) return 'unknown';
  if (entry.lastObservedDays === 0) return 'today';
  return `${humanizeDays(entry.lastObservedDays)} ago`;
}

export default function StatusTable({ entries }: { entries: TreeStatEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => a.prediction.daysToRipeMin - b.prediction.daysToRipeMin,
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tree</th>
            <th>Stage</th>
            <th>To ripe</th>
            <th>In season</th>
            <th>Observed</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.tree.id}>
              <td>{entry.tree.variety ?? entry.tree.species}</td>
              <td className={styles.stage}>{entry.prediction.stage}</td>
              <td>{ripeRange(entry)}</td>
              <td>{entry.inSeasonNow ? 'yes' : 'no'}</td>
              <td className={entry.stale ? styles.stale : undefined}>{lastObserved(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
