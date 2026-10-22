import { jamboTone, TONE_LABEL } from '../lib/jamboStatus.ts';
import type { Tree } from '../types/tree.ts';
import styles from './StatusChip.module.css';

export default function StatusChip({ tree }: { tree: Pick<Tree, 'fruitingStatus' | 'ripeness'> }) {
  const tone = jamboTone(tree);
  return <span className={`${styles.chip} ${styles[tone]}`}>{TONE_LABEL[tone]}</span>;
}
