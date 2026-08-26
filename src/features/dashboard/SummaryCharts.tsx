import type { MonthCount, StageCount } from '../../lib/treeStats.ts';
import styles from './Dashboard.module.css';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface Props {
  byStage: StageCount[];
  perMonthInSeason: MonthCount[];
}

export default function SummaryCharts({ byStage, perMonthInSeason }: Props) {
  const stageMax = Math.max(1, ...byStage.map((s) => s.count));
  const monthMax = Math.max(1, ...perMonthInSeason.map((m) => m.count));

  return (
    <div className={styles.charts}>
      <div className={styles.chart}>
        <h4 className={styles.chartTitle}>Trees per stage</h4>
        <div className={styles.barsH}>
          {byStage.map((s) => (
            <div className={styles.barHRow} key={s.stage}>
              <span className={styles.barHLabel}>{s.stage}</span>
              <span className={styles.barHTrack}>
                <span
                  className={styles.barHFill}
                  style={{ width: `${(s.count / stageMax) * 100}%` }}
                />
              </span>
              <span className={styles.barHValue}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.chart}>
        <h4 className={styles.chartTitle}>In-season trees per month</h4>
        <div className={styles.barsV}>
          {perMonthInSeason.map((m, i) => (
            <div className={styles.barVCol} key={m.month} title={`${m.count} in season`}>
              <span
                className={styles.barVFill}
                style={{ height: `${(m.count / monthMax) * 100}%` }}
              />
              <span className={styles.barVLabel}>{MONTH_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
