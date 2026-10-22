import styles from './ChoiceChips.module.css';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}

/** Single-choice pill buttons (a friendlier radio group). */
export default function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: Props<T>) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`${styles.chip} ${value === o.value ? styles.on : ''}`}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
