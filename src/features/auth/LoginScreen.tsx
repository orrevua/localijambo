import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import styles from './LoginScreen.module.css';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signInWithPassword, signUp } = useAuth();
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
          setInfo('Account created. Check your inbox to confirm your email, then sign in.');
          setMode('signin');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
      <h2 className={styles.title}>Localijambo</h2>
      <p className={styles.subtitle}>
        {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
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
          placeholder="Password"
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
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'signin'
              ? 'Sign in'
              : 'Create account'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.sent}>{info}</p>}
      </form>

      <p className={styles.switch}>
        {mode === 'signin' ? (
          <>
            No account?{' '}
            <button type="button" className={styles.link} onClick={() => switchMode('signup')}>
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" className={styles.link} onClick={() => switchMode('signin')}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
