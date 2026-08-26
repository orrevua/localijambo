import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { create } from '../../data/treesRepo.ts';
import { processPhoto } from '../../lib/photo.ts';
import type { FruitingStatus, Ripeness } from '../../types/tree.ts';
import styles from './TreeForm.module.css';

const FRUITING: FruitingStatus[] = ['none', 'flowering', 'fruiting'];
const RIPENESS: Ripeness[] = ['unknown', 'unripe', 'ripening', 'ripe', 'overripe'];

interface Props {
  lon: number;
  lat: number;
  /** Called after a successful save (e.g. to close a host modal). */
  onCreated?: () => void;
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
      onCreated?.();
      navigate(`/tree/${tree.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the tree.');
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        Variety
        <input
          className={styles.input}
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        Notes
        <textarea
          className={styles.input}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={3}
        />
      </label>
      <label className={styles.field}>
        Fruiting status
        <select
          className={styles.input}
          value={fruitingStatus}
          onChange={(e) => setFruitingStatus(e.target.value as FruitingStatus)}
          disabled={busy}
        >
          {FRUITING.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Ripeness
        <select
          className={styles.input}
          value={ripeness}
          onChange={(e) => setRipeness(e.target.value as Ripeness)}
          disabled={busy}
        >
          {RIPENESS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Photo
        <input
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
      {photo && <img className={styles.preview} src={photo.url} alt="Selected tree" />}
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
          disabled={busy}
        />{' '}
        Share with everyone
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save tree'}
      </button>
    </form>
  );
}
