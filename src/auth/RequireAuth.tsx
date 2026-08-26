import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './useAuth.ts';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function RequireAnon({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return children;
}
