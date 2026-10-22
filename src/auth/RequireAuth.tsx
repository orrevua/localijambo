import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './useAuth.ts';

/** Where to send the user after they sign in. */
export interface LoginState {
  from?: string;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) {
    const state: LoginState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return children;
}

export function RequireAnon({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (session) {
    const from = (location.state as LoginState | null)?.from;
    return <Navigate to={from && from.startsWith('/') ? from : '/'} replace />;
  }
  return children;
}
