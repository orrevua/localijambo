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
import styles from './TreeListScreen.module.css';

type Scope = 'all' | 'mine' | 'ripe';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ripe', label: 'Ripe now' },
  { value: 'mine', label: 'Mine' },
];

export default function TreeListScreen() {
  const { user } = useAuth();
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
          setError(err instanceof Error ? err.message : 'Could not load trees.');
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

  if (error) return <StateMessage tone="error" title="Could not load jambos" detail={error} />;
  if (!trees) return <StateMessage title="Loading jambos…" />;
  if (trees.length === 0)
    return (
      <StateMessage
        title="No jambos yet"
        detail="Add the first jambo tree to see it here and on the map."
      >
        <button type="button" className="btn" onClick={() => open()}>
          <Icon name="plus" size={20} /> Add jambo
        </button>
      </StateMessage>
    );

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <h2 className={styles.title}>Jambos</h2>
        <span className={styles.count}>{trees.length}</span>
      </header>

      <label className={styles.search}>
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Search by name or notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className={styles.scopes} role="radiogroup" aria-label="Filter">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={scope === s.value}
            className={`${styles.scope} ${scope === s.value ? styles.scopeOn : ''}`}
            onClick={() => setScope(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={styles.none}>Nothing matches.</p>
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
                    {new Date(tree.createdAt).toLocaleDateString()}
                    {tree.ownerId === user?.id ? ' · yours' : ''}
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
