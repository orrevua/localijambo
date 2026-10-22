import { useRef, useState } from 'react';
import StatusChip from '../../components/StatusChip.tsx';
import { useI18n } from '../../i18n/useI18n.ts';
import { forecastLabel } from '../../i18n/format.ts';
import { jamboTone, treeName } from '../../lib/jamboStatus.ts';
import { predictFruiting } from '../../lib/phenology.ts';
import { jamboPinSvg } from '../map/jamboPin.ts';
import { useTreeDetailModal } from '../tree-detail/useTreeDetailModal.ts';
import type { Tree } from '../../types/tree.ts';
import styles from './TreeLabel.module.css';

interface Props {
  tree: Tree;
  /** Hide the second line (for narrow columns like the timeline). */
  compact?: boolean;
}

/**
 * A tree's name plus something that tells same-named trees apart. Hovering
 * (or focusing) shows a summary card; clicking opens the full details.
 */
export default function TreeLabel({ tree, compact }: Props) {
  const { t, locale } = useI18n();
  const { open } = useTreeDetailModal();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);

  const added = new Date(tree.createdAt).toLocaleDateString(locale);
  const subtitle = tree.notes || `${t.detail.added} ${added}`;

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Card is fixed-positioned so table scroll containers can't clip it.
    const above = r.bottom + 220 > window.innerHeight;
    setPos({ x: Math.min(r.left, window.innerWidth - 272), y: above ? r.top : r.bottom, above });
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.label}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onClick={() => {
          setPos(null);
          open(tree.id);
        }}
      >
        <span
          className={styles.pin}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: jamboPinSvg(jamboTone(tree)) }}
        />
        <span className={styles.text}>
          <span className={styles.name}>{treeName(tree)}</span>
          {!compact && <span className={styles.sub}>{subtitle}</span>}
        </span>
      </button>
      {pos && (
        <div
          className={styles.card}
          role="tooltip"
          style={{
            left: Math.max(8, pos.x),
            top: pos.y,
            transform: pos.above ? 'translateY(calc(-100% - 6px))' : 'translateY(6px)',
          }}
        >
          <div className={styles.cardHead}>
            <strong>{treeName(tree)}</strong>
            <StatusChip tree={tree} />
          </div>
          <p className={styles.forecast}>{forecastLabel(t, predictFruiting(tree, new Date()))}</p>
          {tree.notes && <p className={styles.notes}>{tree.notes}</p>}
          <dl className={styles.meta}>
            <dt>{t.detail.added}</dt>
            <dd>{added}</dd>
            <dt>{t.detail.observed}</dt>
            <dd>{new Date(tree.updatedAt).toLocaleDateString(locale)}</dd>
            <dt>{t.detail.visibility}</dt>
            <dd>{tree.isShared ? t.detail.shared : t.detail.onlyYou}</dd>
            <dt>GPS</dt>
            <dd>
              {tree.lat.toFixed(5)}, {tree.lon.toFixed(5)}
            </dd>
          </dl>
          <span className={styles.hint}>{t.dashboard.clickForMore}</span>
        </div>
      )}
    </>
  );
}
