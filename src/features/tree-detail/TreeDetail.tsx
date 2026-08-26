import { useEffect, useState } from 'react';
import { getById, remove, setShared } from '../../data/treesRepo.ts';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../auth/useAuth.ts';
import StateMessage from '../../components/StateMessage.tsx';
import { predictFruiting } from '../../lib/phenology.ts';
import type { Tree } from '../../types/tree.ts';
import styles from './TreeDetailScreen.module.css';

interface Props {
  id: string;
  /** Called after the tree is deleted (page navigates away / modal closes). */
  onDeleted: () => void;
}

export default function TreeDetail({ id, onDeleted }: Props) {
  const { user } = useAuth();
  const [tree, setTree] = useState<Tree | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getById(id)
      .then((data) => {
        if (!active) return;
        setTree(data);
        setLoaded(true);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load tree.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const photoPath = tree?.photoPath;
  useEffect(() => {
    let active = true;
    if (!photoPath) {
      return () => {
        active = false;
      };
    }
    supabase.storage
      .from('tree-photos')
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => {
        if (active) setPhotoUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
      setPhotoUrl(null);
    };
  }, [photoPath]);

  if (error) return <StateMessage tone="error" title="Could not load tree" detail={error} />;
  if (!loaded) return <StateMessage title="Loading tree…" />;
  if (!tree)
    return (
      <StateMessage
        title="Tree not found"
        detail="It may have been deleted or is not shared with you."
      />
    );

  const isOwner = user?.id === tree.ownerId;
  const forecast = predictFruiting(tree, new Date());

  async function onToggleShared() {
    if (!tree) return;
    setBusy(true);
    setError(null);
    try {
      await setShared(tree.id, !tree.isShared);
      setTree({ ...tree, isShared: !tree.isShared });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update sharing.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!tree) return;
    setBusy(true);
    setError(null);
    try {
      await remove(tree.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tree.');
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>{tree.variety ?? tree.species}</h2>
      {photoUrl && <img className={styles.photo} src={photoUrl} alt={tree.species} />}
      <dl className={styles.fields}>
        <dt>Species</dt>
        <dd>{tree.species}</dd>
        {tree.variety && (
          <>
            <dt>Variety</dt>
            <dd>{tree.variety}</dd>
          </>
        )}
        <dt>Fruiting</dt>
        <dd>{tree.fruitingStatus}</dd>
        <dt>Ripeness</dt>
        <dd>{tree.ripeness}</dd>
        <dt>Forecast</dt>
        <dd>
          <span className={forecast.inSeason ? styles.inSeason : undefined}>{forecast.label}</span>
          {forecast.confidence === 'calendar' && (
            <span
              className={styles.estimate}
              title="Estimated from the seasonal calendar, not a recent observation"
            >
              {' '}
              · estimated
            </span>
          )}
        </dd>
        {tree.notes && (
          <>
            <dt>Notes</dt>
            <dd>{tree.notes}</dd>
          </>
        )}
        <dt>Shared</dt>
        <dd>{tree.isShared ? 'Yes' : 'No'}</dd>
      </dl>
      {isOwner && (
        <div className={styles.controls}>
          <label>
            <input type="checkbox" checked={tree.isShared} disabled={busy} onChange={onToggleShared} />{' '}
            Shared
          </label>
          <button type="button" className={styles.delete} disabled={busy} onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
