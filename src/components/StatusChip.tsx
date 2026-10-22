import { jamboTone } from '../lib/jamboStatus.ts';
import { useI18n } from '../i18n/useI18n.ts';
import type { Tree } from '../types/tree.ts';
import styles from './StatusChip.module.css';

export default function StatusChip({ tree }: { tree: Pick<Tree, 'fruitingStatus' | 'ripeness'> }) {
  const tone = jamboTone(tree);
  const { t } = useI18n();
  return <span className={`${styles.chip} ${styles[tone]}`}>{t.tone[tone]}</span>;
}
