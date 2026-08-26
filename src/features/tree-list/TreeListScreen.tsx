import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { listVisible } from '../../data/treesRepo.ts';
import StateMessage from '../../components/StateMessage.tsx';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import type { Tree } from '../../types/tree.ts';
import styles from './TreeListScreen.module.css';

export default function TreeListScreen() {
  const { open } = useAddTreeModal();
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listVisible()
      .then((data) => {
        if (!active) return;
        const sorted = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setTrees(sorted);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load trees.');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return <StateMessage tone="error" title="Could not load trees" detail={error} />;
  if (!trees) return <StateMessage title="Loading trees…" />;
  if (trees.length === 0)
    return (
      <StateMessage
        title="No trees yet"
        detail="Add the first jambo tree to see it here and on the map."
      >
        <button type="button" className="btn" onClick={() => open()}>
          Add a tree
        </button>
      </StateMessage>
    );

  return (
    <ul className={styles.list}>
      {trees.map((tree) => (
        <li key={tree.id}>
          <Link className={styles.row} to={`/tree/${tree.id}`}>
            <span className={styles.species}>{tree.variety ?? tree.species}</span>
            <div className={styles.meta}>{new Date(tree.createdAt).toLocaleDateString()}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
