import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { create } from '../../data/treesRepo.ts';
import { processPhoto } from '../../lib/photo.ts';
import Icon from '../../components/Icon.tsx';
import ChoiceChips from '../../components/ChoiceChips.tsx';
import type { FruitingStatus, Ripeness } from '../../types/tree.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import { fruitingOptions, ripenessFor, ripenessOptions } from '../../i18n/format.ts';
import styles from './TreeForm.module.css';


interface Props {
  lon: number;
  lat: number;
  /** Called after a successful save (e.g. to close a host modal). */
  onCreated?: () => void;
}

export default function TreeForm({ lon, lat, onCreated }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [variety, setVariety] = useState(t.form.defaultName);
  const [notes, setNotes] = useState('');
  const [fruitingStatus, setFruitingStatus] = useState<FruitingStatus>('none');
  const [ripeness, setRipeness] = useState<Ripeness>('unknown');
  const [isShared, setIsShared] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  async function onPickPhoto(file: File) {
    setError(null);
    try {
      const processed = await processPhoto(file);
      setPhoto((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return processed;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form.photoError);
    }
  }

  function onFruiting(v: FruitingStatus) {
    setFruitingStatus(v);
    setRipeness(ripenessFor(v, ripeness));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tree = await create(
        {
          clientId: crypto.randomUUID(),
          lon,
          lat,
          species: 'Syzygium malaccense',
          variety: variety.trim() || undefined,
          notes: notes.trim() || undefined,
          fruitingStatus,
          ripeness,
          isShared,
        },
        photo?.blob,
      );
      if (onCreated) onCreated();
      else navigate(`/tree/${tree.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form.saveError);
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <span className={styles.label}>{t.form.howNow}</span>
        <ChoiceChips
          label={t.form.fruitingLabel}
          options={fruitingOptions(t)}
          value={fruitingStatus}
          onChange={onFruiting}
          disabled={busy}
        />
        {fruitingStatus === 'fruiting' && (
          <ChoiceChips
            label={t.form.ripenessLabel}
            options={ripenessOptions(t)}
            value={ripeness}
            onChange={setRipeness}
            disabled={busy}
          />
        )}
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t.form.name}</span>
        <input
          className={styles.input}
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          disabled={busy}
          placeholder={t.form.defaultName}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>
          {t.form.notes} <span className={styles.optional}>{t.form.optional}</span>
        </span>
        <textarea
          className={styles.input}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={2}
          placeholder={t.form.notesPlaceholder}
        />
      </label>

      <label className={styles.photo}>
        {photo ? (
          <img className={styles.preview} src={photo.url} alt={t.form.photoAlt} />
        ) : (
          <>
            <Icon name="camera" />
            <span>{t.form.addPhoto}</span>
          </>
        )}
        <input
          className={styles.fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickPhoto(file);
          }}
        />
      </label>

      <label className={styles.toggle}>
        <span>
          <span className={styles.label}>{t.form.share}</span>
          <span className={styles.hint}>{t.form.shareHint}</span>
        </span>
        <input
          type="checkbox"
          className={styles.switch}
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
          disabled={busy}
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? t.form.saving : t.form.save}
      </button>
    </form>
  );
}
