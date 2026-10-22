import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { create } from '../../data/treesRepo.ts';
import { processPhoto } from '../../lib/photo.ts';
import Icon from '../../components/Icon.tsx';
import type { FruitingStatus, Ripeness } from '../../types/tree.ts';
import styles from './TreeForm.module.css';

const FRUITING: { value: FruitingStatus; label: string }[] = [
  { value: 'none', label: 'Resting' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting' },
];

const RIPENESS: { value: Ripeness; label: string }[] = [
  { value: 'unripe', label: 'Green' },
  { value: 'ripening', label: 'Ripening' },
  { value: 'ripe', label: 'Ripe' },
  { value: 'overripe', label: 'Overripe' },
];

interface Props {
  lon: number;
  lat: number;
  /** Called after a successful save (e.g. to close a host modal). */
  onCreated?: () => void;
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`${styles.chip} ${value === o.value ? styles.chipOn : ''}`}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function TreeForm({ lon, lat, onCreated }: Props) {
  const navigate = useNavigate();
  const [variety, setVariety] = useState('jambo vermelho');
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
      setError(err instanceof Error ? err.message : 'Could not process the photo.');
    }
  }

  function onFruiting(v: FruitingStatus) {
    setFruitingStatus(v);
    if (v !== 'fruiting') setRipeness('unknown');
    else if (ripeness === 'unknown') setRipeness('unripe');
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
      setError(err instanceof Error ? err.message : 'Could not save the tree.');
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <span className={styles.label}>How is it now?</span>
        <Chips
          label="Fruiting status"
          options={FRUITING}
          value={fruitingStatus}
          onChange={onFruiting}
          disabled={busy}
        />
        {fruitingStatus === 'fruiting' && (
          <Chips
            label="Ripeness"
            options={RIPENESS}
            value={ripeness}
            onChange={setRipeness}
            disabled={busy}
          />
        )}
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          disabled={busy}
          placeholder="jambo vermelho"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>
          Notes <span className={styles.optional}>optional</span>
        </span>
        <textarea
          className={styles.input}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={2}
          placeholder="Next to the bakery, branches over the wall…"
        />
      </label>

      <label className={styles.photo}>
        {photo ? (
          <img className={styles.preview} src={photo.url} alt="Selected tree" />
        ) : (
          <>
            <Icon name="camera" />
            <span>Add a photo</span>
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
          <span className={styles.label}>Share with everyone</span>
          <span className={styles.hint}>Others will see this jambo on their map</span>
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
        {busy ? 'Saving…' : 'Save jambo'}
      </button>
    </form>
  );
}
