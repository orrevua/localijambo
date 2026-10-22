import { Outlet } from 'react-router';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import OfflineIndicator from './components/OfflineIndicator';
import { AddTreeModalProvider } from './features/add-tree/AddTreeModalProvider';
import { NavDrawerProvider } from './features/nav/NavDrawerProvider';
import { TreeDetailModalProvider } from './features/tree-detail/TreeDetailModalProvider';
import styles from './App.module.css';

export default function App() {
  return (
    <NavDrawerProvider>
      <AddTreeModalProvider>
        <TreeDetailModalProvider>
          <div className={styles.shell}>
            <Header />
            <OfflineIndicator />
            <main className={styles.main}>
              <Outlet />
            </main>
            <BottomNav />
          </div>
        </TreeDetailModalProvider>
      </AddTreeModalProvider>
    </NavDrawerProvider>
  );
}
