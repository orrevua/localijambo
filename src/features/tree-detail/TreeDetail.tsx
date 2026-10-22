import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getById, remove, setShared, updateStatus } from '../../data/treesRepo.ts';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../auth/useAuth.ts';
import StateMessage from '../../components/StateMessage.tsx';
import StatusChip from '../../components/StatusChip.tsx';
import Icon from '../../components/Icon.tsx';
import { predictFruiting } from '../../lib/phenology.ts';
import { treeName } from '../../lib/jamboStatus.ts';
import type { Tree } from '../../types/tree.ts';
import type { MapFocusState } from '../map/MapView.tsx';
import { useI18n } from '../../i18n/useI18n.ts';
import ChoiceChips from '../../components/ChoiceChips.tsx';
import { forecastLabel, fruitingOptions, ripenessFor, ripenessOptions } from '../../i18n/format.ts';
import { ownerLabel } from './ownerLabel.ts';
import styles from './TreeDetailScreen.module.css';

interface Props {
  id: string;
  /** Called after the tree is deleted (page navigates away / modal closes). */
  onDeleted: () => void;
  /** Called when the user jumps to the tree on the map (e.g. to close a modal). */
  onShowOnMap?: () => void;
}

export default function TreeDetail({ id, onDeleted, onShowOnMap }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [tree, setTree] = useState<Tree | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState<Pick<Tree, 'fruitingStatus' | 'ripeness'> | null>(null);

  useEffect(() => {
    let active = true;
    getById(id)
      .then((data) => {
        if (!active) return;
        setTree(data);
        setLoaded(true);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
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
    return <StateMessage tone="error" title={t.detail.loadError} detail={error} />;
  if (!loaded) return <StateMessage title={t.detail.loading} />;
  if (!tree) return <StateMessage title={t.detail.notFound} detail={t.detail.notFoundDetail} />;

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
      setError(err instanceof Error ? err.message : t.detail.shareError);
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
      setError(err instanceof Error ? err.message : t.detail.deleteError);
      setBusy(false);
      setConfirming(false);
    }
  }

  async function onSaveStatus() {
    if (!tree || !draft) return;
    setBusy(true);
    setError(null);
    try {
      setTree(await updateStatus(tree.id, draft.fruitingStatus, draft.ripeness));
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.detail.statusError);
    } finally {
      setBusy(false);
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

      <p className={styles.by}>{t.detail.addedBy(ownerLabel(t, tree, user?.id))}</p>

      {photoUrl && <img className={styles.photo} src={photoUrl} alt={treeName(tree)} />}

      <div className={`${styles.forecast} ${forecast.inSeason ? styles.inSeason : ''}`}>
        <span className={styles.forecastLabel}>{t.detail.forecast}</span>
        <span>
          {forecastLabel(t, forecast)}
          {forecast.confidence === 'calendar' && (
            <span className={styles.estimate} title={t.detail.estimatedTitle}>
              {' '}
              · {t.detail.estimated}
            </span>
          )}
        </span>
      </div>

      {isOwner &&
        (draft ? (
          <div className={styles.statusEdit}>
            <span className={styles.statusTitle}>{t.form.howNow}</span>
            <ChoiceChips
              label={t.form.fruitingLabel}
              options={fruitingOptions(t)}
              value={draft.fruitingStatus}
              onChange={(v) =>
                setDraft({ fruitingStatus: v, ripeness: ripenessFor(v, draft.ripeness) })
              }
              disabled={busy}
            />
            {draft.fruitingStatus === 'fruiting' && (
              <ChoiceChips
                label={t.form.ripenessLabel}
                options={ripenessOptions(t)}
                value={draft.ripeness}
                onChange={(v) => setDraft({ ...draft, ripeness: v })}
                disabled={busy}
              />
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                {t.map.cancel}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={onSaveStatus}>
                {busy ? t.form.saving : t.detail.saveStatus}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.updateStatus}
            onClick={() =>
              setDraft({ fruitingStatus: tree.fruitingStatus, ripeness: tree.ripeness })
            }
          >
            {t.detail.updateStatus}
            <span className={styles.updateHint}>{t.detail.updateHint}</span>
          </button>
        ))}

      <dl className={styles.fields}>
        {tree.fruitingStatus === 'fruiting' && (
          <div>
            <dt>{t.detail.ripeness}</dt>
            <dd>{t.profile.ripenessValue[tree.ripeness]}</dd>
          </div>
        )}
        <div>
          <dt>{t.detail.added}</dt>
          <dd>{new Date(tree.createdAt).toLocaleDateString(locale)}</dd>
        </div>
        {isOwner && (
          <div>
            <dt>{t.detail.visibility}</dt>
            <dd>{tree.isShared ? t.detail.shared : t.detail.onlyYou}</dd>
          </div>
        )}
        {tree.notes && (
          <div className={styles.wide}>
            <dt>{t.detail.notes}</dt>
            <dd>{tree.notes}</dd>
          </div>
        )}
      </dl>

      <button type="button" className="btn btn-soft" onClick={showOnMap}>
        <Icon name="pin" size={20} /> {t.detail.showOnMap}
      </button>

      {isOwner && (
        <div className={styles.owner}>
          <label className={styles.toggle}>
            <span>{t.detail.share}</span>
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
              <span>{t.detail.confirmDelete}</span>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  {t.detail.keep}
                </button>
                <button
                  type="button"
                  className={`btn ${styles.danger}`}
                  disabled={busy}
                  onClick={onDelete}
                >
                  {busy ? t.detail.deleting : t.detail.delete}
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
              <Icon name="trash" size={18} /> {t.detail.deleteJambo}
            </button>
          )}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
