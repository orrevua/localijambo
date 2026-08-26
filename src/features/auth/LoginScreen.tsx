import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import styles from './LoginScreen.module.css';

export default function LoginScreen() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      await signInWithOtp(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not send the magic link.');
    }
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Localijambo</h2>
      {status === 'sent' ? (
        <p className={styles.sent}>Check your inbox for a sign-in link.</p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit}>
          <input
            className={styles.input}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'sending'}
          />
          <button className="btn" type="submit" disabled={status === 'sending' || !email.trim()}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
    </div>
  );
}
