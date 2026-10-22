import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/useI18n.ts';
import LanguageToggle from '../../components/LanguageToggle.tsx';
import styles from './LoginScreen.module.css';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signInWithPassword, signUp } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email.trim(), password);
        // On success the session updates and RequireAnon redirects to "/".
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setInfo(t.login.created);
          setMode('signin');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.error);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.lang}>
        <LanguageToggle />
      </div>
      <img className={styles.logo} src="/logo.svg" alt="" width={72} height={72} />
      <h1 className={styles.title}>localijambo</h1>
      <p className={styles.subtitle}>
        {mode === 'signin' ? t.login.signInSubtitle : t.login.signUpSubtitle}
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="email"
          required
          autoComplete="email"
          placeholder={t.login.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <input
          className={styles.input}
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder={t.login.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        <button
          className="btn"
          type="submit"
          disabled={busy || !email.trim() || password.length < 6}
        >
          {busy
            ? mode === 'signin'
              ? t.login.signingIn
              : t.login.creating
            : mode === 'signin'
              ? t.login.signIn
              : t.login.createAccount}
        </button>
        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.sent}>{info}</p>}
      </form>

      <p className={styles.switch}>
        {mode === 'signin' ? (
          <>
            {t.login.noAccount}{' '}
            <button type="button" className={styles.link} onClick={() => switchMode('signup')}>
              {t.login.createOne}
            </button>
          </>
        ) : (
          <>
            {t.login.haveAccount}{' '}
            <button type="button" className={styles.link} onClick={() => switchMode('signin')}>
              {t.login.signIn}
            </button>
          </>
        )}
      </p>
      <Link to="/" className={styles.browse}>
        {t.common.browseMap}
      </Link>
    </div>
  );
}
