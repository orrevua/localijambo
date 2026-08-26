import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App.tsx';
import MapView from './features/map/MapView.tsx';
import TreeListScreen from './features/tree-list/TreeListScreen.tsx';
import TreeDetailScreen from './features/tree-detail/TreeDetailScreen.tsx';
import LoginScreen from './features/auth/LoginScreen.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { SyncProvider } from './sync/SyncProvider.tsx';
import { RequireAnon, RequireAuth } from './auth/RequireAuth.tsx';
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
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <MapView /> },
      { path: 'list', element: <TreeListScreen /> },
      { path: 'tree/:id', element: <TreeDetailScreen /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SyncProvider>
        <RouterProvider router={router} />
      </SyncProvider>
    </AuthProvider>
  </StrictMode>,
);
