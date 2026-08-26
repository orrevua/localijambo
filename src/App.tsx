import { Outlet } from 'react-router';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import OfflineIndicator from './components/OfflineIndicator';
import SyncStatusBadge from './components/SyncStatusBadge';
import { AddTreeModalProvider } from './features/add-tree/AddTreeModalProvider';
import styles from './App.module.css';

export default function App() {
  return (
    <AddTreeModalProvider>
      <div className={styles.shell}>
        <Header />
        <OfflineIndicator />
        <div className={styles.status}>
          <SyncStatusBadge />
        </div>
        <main className={styles.main}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </AddTreeModalProvider>
  );
}
