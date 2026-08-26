import type { TimelineBand } from '../../lib/treeStats.ts';
import styles from './Dashboard.module.css';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function cellClass(band: TimelineBand, month: number): string {
  const classes = [styles.cell];
  if (band.peakMonths.includes(month)) classes.push(styles.peak);
  else if (band.harvestMonths.includes(month)) classes.push(styles.harvest);
  else if (band.floweringMonths.includes(month)) classes.push(styles.flowering);
  return classes.join(' ');
}

export default function SeasonTimeline({ bands }: { bands: TimelineBand[] }) {
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHead}>
        <span className={styles.timelineName} />
        {MONTH_LABELS.map((m, i) => (
          <span key={i} className={styles.monthLabel}>
            {m}
          </span>
        ))}
      </div>
      {bands.map((band) => (
        <div className={styles.timelineRow} key={band.tree.id}>
          <span className={styles.timelineName}>{band.tree.variety ?? band.tree.species}</span>
          {MONTHS.map((month) => (
            <span key={month} className={cellClass(band, month)} />
          ))}
        </div>
      ))}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.flowering}`} /> flowering
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.harvest}`} /> harvest
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.peak}`} /> peak
        </span>
      </div>
    </div>
  );
}
