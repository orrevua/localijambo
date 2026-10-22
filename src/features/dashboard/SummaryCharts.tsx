import type { MonthCount, StageCount } from '../../lib/treeStats.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import styles from './Dashboard.module.css';

interface Props {
  byStage: StageCount[];
  perMonthInSeason: MonthCount[];
}

export default function SummaryCharts({ byStage, perMonthInSeason }: Props) {
  const { t } = useI18n();
  const stageMax = Math.max(1, ...byStage.map((s) => s.count));
  const monthMax = Math.max(1, ...perMonthInSeason.map((m) => m.count));

  return (
    <div className={styles.charts}>
      <div className={styles.chart}>
        <h4 className={styles.chartTitle}>{t.dashboard.perStage}</h4>
        <div className={styles.barsH}>
          {byStage.map((s) => (
            <div className={styles.barHRow} key={s.stage}>
              <span className={styles.barHLabel}>{t.stage[s.stage]}</span>
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
        <h4 className={styles.chartTitle}>{t.dashboard.perMonth}</h4>
        <div className={styles.barsV}>
          {perMonthInSeason.map((m, i) => (
            <div
              className={styles.barVCol}
              key={m.month}
              title={t.dashboard.inSeasonCount(m.count)}
            >
              <span
                className={styles.barVFill}
                style={{ height: `${(m.count / monthMax) * 100}%` }}
              />
              <span className={styles.barVLabel}>{t.dashboard.months[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
