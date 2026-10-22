import type { TreeStatEntry } from '../../lib/treeStats.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import { humanizeDays } from '../../i18n/format.ts';
import type { Messages } from '../../i18n/messages.ts';
import TreeLabel from './TreeLabel.tsx';
import styles from './Dashboard.module.css';

function ripeRange(t: Messages, entry: TreeStatEntry): string {
  const { daysToRipeMin: min, daysToRipeMax: max } = entry.prediction;
  if (min === 0 && max === 0) return t.dashboard.now;
  if (min === 0) return t.dashboard.upTo(`${max} ${t.dashboard.daysShort}`);
  if (min === max) return humanizeDays(t, min);
  return `${min}–${max} ${t.dashboard.daysShort}`;
}

function lastObserved(t: Messages, entry: TreeStatEntry): string {
  if (entry.lastObservedDays === null) return t.dashboard.unknown;
  if (entry.lastObservedDays === 0) return t.dashboard.today;
  return t.dashboard.ago(humanizeDays(t, entry.lastObservedDays));
}

export default function StatusTable({ entries }: { entries: TreeStatEntry[] }) {
  const { t } = useI18n();
  const sorted = [...entries].sort(
    (a, b) => a.prediction.daysToRipeMin - b.prediction.daysToRipeMin,
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.dashboard.colTree}</th>
            <th>{t.dashboard.colStage}</th>
            <th>{t.dashboard.colToRipe}</th>
            <th>{t.dashboard.colInSeason}</th>
            <th>{t.dashboard.colObserved}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.tree.id}>
              <td>
                <TreeLabel tree={entry.tree} />
              </td>
              <td>{t.stage[entry.prediction.stage]}</td>
              <td>{ripeRange(t, entry)}</td>
              <td>{entry.inSeasonNow ? t.dashboard.yes : t.dashboard.no}</td>
              <td className={entry.stale ? styles.stale : undefined}>{lastObserved(t, entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
