import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getById, remove, setShared } from '../../data/treesRepo.ts';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../auth/useAuth.ts';
import StateMessage from '../../components/StateMessage.tsx';
import StatusChip from '../../components/StatusChip.tsx';
import Icon from '../../components/Icon.tsx';
import { predictFruiting } from '../../lib/phenology.ts';
import { treeName } from '../../lib/jamboStatus.ts';
import type { Tree } from '../../types/tree.ts';
import type { MapFocusState } from '../map/MapView.tsx';
import styles from './TreeDetailScreen.module.css';

interface Props {
  id: string;
  /** Called after the tree is deleted (page navigates away / modal closes). */
  onDeleted: () => void;
  /** Called when the user jumps to the tree on the map (e.g. to close a modal). */
  onShowOnMap?: () => void;
}

const RIPENESS_LABEL: Record<Tree['ripeness'], string> = {
  unknown: '—',
  unripe: 'Green',
  ripening: 'Ripening',
  ripe: 'Ripe',
  overripe: 'Overripe',
};

export default function TreeDetail({ id, onDeleted, onShowOnMap }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tree, setTree] = useState<Tree | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  if (!loaded && error)
    return <StateMessage tone="error" title="Could not load jambo" detail={error} />;
  if (!loaded) return <StateMessage title="Loading jambo…" />;
  if (!tree)
    return (
      <StateMessage
        title="Jambo not found"
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
      setConfirming(false);
    }
  }

  function showOnMap() {
    if (!tree) return;
    onShowOnMap?.();
    const state: MapFocusState = { focus: { lon: tree.lon, lat: tree.lat } };
    navigate('/', { state });
  }

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <h2 className={styles.title}>{treeName(tree)}</h2>
        <StatusChip tree={tree} />
      </header>

      {photoUrl && <img className={styles.photo} src={photoUrl} alt={treeName(tree)} />}

      <div className={`${styles.forecast} ${forecast.inSeason ? styles.inSeason : ''}`}>
        <span className={styles.forecastLabel}>Forecast</span>
        <span>
          {forecast.label}
          {forecast.confidence === 'calendar' && (
            <span
              className={styles.estimate}
              title="Estimated from the seasonal calendar, not a recent observation"
            >
              {' '}
              · estimated
            </span>
          )}
        </span>
      </div>

      <dl className={styles.fields}>
        {tree.fruitingStatus === 'fruiting' && (
          <div>
            <dt>Ripeness</dt>
            <dd>{RIPENESS_LABEL[tree.ripeness]}</dd>
          </div>
        )}
        <div>
          <dt>Added</dt>
          <dd>{new Date(tree.createdAt).toLocaleDateString()}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>{tree.isShared ? 'Shared' : 'Only you'}</dd>
        </div>
        {tree.notes && (
          <div className={styles.wide}>
            <dt>Notes</dt>
            <dd>{tree.notes}</dd>
          </div>
        )}
      </dl>

      <button type="button" className="btn btn-soft" onClick={showOnMap}>
        <Icon name="pin" size={20} /> Show on map
      </button>

      {isOwner && (
        <div className={styles.owner}>
          <label className={styles.toggle}>
            <span>Share with everyone</span>
            <input
              type="checkbox"
              className={styles.switch}
              checked={tree.isShared}
              disabled={busy}
              onChange={onToggleShared}
            />
          </label>
          {confirming ? (
            <div className={styles.confirm}>
              <span>Delete this jambo for everyone?</span>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  Keep
                </button>
                <button
                  type="button"
                  className={`btn ${styles.danger}`}
                  disabled={busy}
                  onClick={onDelete}
                >
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.delete}
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Icon name="trash" size={18} /> Delete jambo
            </button>
          )}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
