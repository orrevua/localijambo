import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import { listMine } from '../../data/treesRepo.ts';
import { buildTreeStats } from '../../lib/treeStats.ts';
import type { TreeStatsVM } from '../../lib/treeStats.ts';
import StateMessage from '../../components/StateMessage.tsx';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import styles from './ProfileScreen.module.css';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { open } = useAddTreeModal();
  const [vm, setVm] = useState<TreeStatsVM | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    listMine(userId)
      .then((trees) => {
        if (active) setVm(buildTreeStats(trees, new Date()));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your trees.');
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!user) return <StateMessage title="Not signed in" />;
  if (error) return <StateMessage tone="error" title="Could not load profile" detail={error} />;
  if (!vm) return <StateMessage title="Loading profile…" />;

  return (
    <div className={styles.screen}>
      <header className={styles.identity}>
        <h2 className={styles.title}>Profile</h2>
        <p className={styles.email}>{user.email}</p>
      </header>

      {vm.total === 0 ? (
        <StateMessage title="No trees yet" detail="Add your first jambo tree to see your stats here.">
          <button type="button" className="btn" onClick={() => open()}>
            Add a tree
          </button>
        </StateMessage>
      ) : (
        <>
          <div className={styles.cards}>
            <Stat label="Trees added" value={vm.total} big />
            <Stat label="In season now" value={vm.inSeasonNowCount} />
            <Stat label="Ready to pick" value={vm.readyNowCount} />
            <Stat label="Shared" value={vm.sharedCount} />
            <Stat label="Private" value={vm.privateCount} />
          </div>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>By fruiting status</h3>
            <dl className={styles.rows}>
              {Object.entries(vm.byFruitingStatus).map(([k, n]) => (
                <div className={styles.row} key={k}>
                  <dt>{k}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>By ripeness</h3>
            <dl className={styles.rows}>
              {Object.entries(vm.byRipeness).map(([k, n]) => (
                <div className={styles.row} key={k}>
                  <dt>{k}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div className={`${styles.card} ${big ? styles.cardBig : ''}`}>
      <span className={styles.cardValue}>{value}</span>
      <span className={styles.cardLabel}>{label}</span>
    </div>
  );
}
