import { useI18n } from '../i18n/useI18n.ts';
import { LANGS } from '../i18n/messages.ts';
import styles from './LanguageToggle.module.css';

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={styles.toggle} role="radiogroup" aria-label={t.common.language}>
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          role="radio"
          aria-checked={lang === l.value}
          className={`${styles.option} ${lang === l.value ? styles.on : ''}`}
          onClick={() => setLang(l.value)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
