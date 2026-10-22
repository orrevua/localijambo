import { useEffect, useMemo, useState } from 'react';
import { listVisible } from '../../data/treesRepo.ts';
import { onTreesChanged } from '../../sync/syncEvents.ts';
import { useAuth } from '../../auth/useAuth.ts';
import StateMessage from '../../components/StateMessage.tsx';
import StatusChip from '../../components/StatusChip.tsx';
import Icon from '../../components/Icon.tsx';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import { useTreeDetailModal } from '../tree-detail/useTreeDetailModal.ts';
import { jamboTone, treeName } from '../../lib/jamboStatus.ts';
import { jamboPinSvg } from '../map/jamboPin.ts';
import type { Tree } from '../../types/tree.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import styles from './TreeListScreen.module.css';

type Scope = 'all' | 'mine' | 'ripe';

const SCOPES: Scope[] = ['all', 'ripe', 'mine'];

export default function TreeListScreen() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { open } = useAddTreeModal();
  const { open: openDetail } = useTreeDetailModal();
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');

  useEffect(() => {
    let active = true;
    const load = () => {
      listVisible()
        .then((data) => {
          if (!active) return;
          setTrees(data);
          setError(null);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : String(err));
        });
    };
    load();
    const off = onTreesChanged(load);
    return () => {
      active = false;
      off();
    };
  }, []);

  const shown = useMemo(() => {
    if (!trees) return [];
    const q = query.trim().toLowerCase();
    return trees.filter((t) => {
      if (scope === 'mine' && t.ownerId !== user?.id) return false;
      if (scope === 'ripe' && jamboTone(t) !== 'ripe') return false;
      if (!q) return true;
      return [t.variety, t.species, t.notes].some((s) => s?.toLowerCase().includes(q));
    });
  }, [trees, query, scope, user?.id]);

  if (error) return <StateMessage tone="error" title={t.list.loadError} detail={error} />;
  if (!trees) return <StateMessage title={t.list.loading} />;
  if (trees.length === 0)
    return (
      <StateMessage title={t.list.empty} detail={t.list.emptyDetail}>
        <button type="button" className="btn" onClick={() => open()}>
          <Icon name="plus" size={20} /> {t.nav.add}
        </button>
      </StateMessage>
    );

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t.list.title}</h2>
        <span className={styles.count}>{trees.length}</span>
      </header>

      <label className={styles.search}>
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder={t.list.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className={styles.scopes} role="radiogroup" aria-label={t.list.filter}>
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={scope === s}
            className={`${styles.scope} ${scope === s ? styles.scopeOn : ''}`}
            onClick={() => setScope(s)}
          >
            {t.list[s]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={styles.none}>{t.list.none}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((tree) => (
            <li key={tree.id}>
              <button type="button" className={styles.row} onClick={() => openDetail(tree.id)}>
                <span
                  className={styles.pin}
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: jamboPinSvg(jamboTone(tree)) }}
                />
                <span className={styles.text}>
                  <span className={styles.name}>{treeName(tree)}</span>
                  <span className={styles.meta}>
                    {new Date(tree.createdAt).toLocaleDateString(locale)}
                    {tree.ownerId === user?.id ? ` · ${t.list.yours}` : ''}
                    {tree.notes ? ` · ${tree.notes}` : ''}
                  </span>
                </span>
                <StatusChip tree={tree} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
