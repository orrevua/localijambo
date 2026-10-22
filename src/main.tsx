import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App.tsx';
import MapView from './features/map/MapView.tsx';
import TreeListScreen from './features/tree-list/TreeListScreen.tsx';
import TreeDetailScreen from './features/tree-detail/TreeDetailScreen.tsx';
import ProfileScreen from './features/profile/ProfileScreen.tsx';
import DashboardScreen from './features/dashboard/DashboardScreen.tsx';
import LoginScreen from './features/auth/LoginScreen.tsx';
import RouteError from './components/RouteError.tsx';
import NotFound from './components/NotFound.tsx';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { SyncProvider } from './sync/SyncProvider.tsx';
import { RequireAnon, RequireAuth } from './auth/RequireAuth.tsx';
import './pwa/useInstallPrompt.ts';
import './styles/theme.css';
import './styles/global.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RequireAnon>
        <LoginScreen />
      </RequireAnon>
    ),
    errorElement: <RouteError />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <MapView /> },
      { path: 'list', element: <TreeListScreen /> },
      { path: 'tree/:id', element: <TreeDetailScreen /> },
      { path: 'profile', element: <ProfileScreen /> },
      { path: 'dashboard', element: <DashboardScreen /> },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
    <AuthProvider>
      <SyncProvider>
        <RouterProvider router={router} />
      </SyncProvider>
    </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
