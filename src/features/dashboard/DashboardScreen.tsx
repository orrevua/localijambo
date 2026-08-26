import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import { listMine } from '../../data/treesRepo.ts';
import { buildTreeStats } from '../../lib/treeStats.ts';
import type { TreeStatsVM } from '../../lib/treeStats.ts';
import StateMessage from '../../components/StateMessage.tsx';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import ReadyNowList from './ReadyNowList.tsx';
import SeasonTimeline from './SeasonTimeline.tsx';
import StatusTable from './StatusTable.tsx';
import SummaryCharts from './SummaryCharts.tsx';
import styles from './Dashboard.module.css';

export default function DashboardScreen() {
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

  if (error) return <StateMessage tone="error" title="Could not load dashboard" detail={error} />;
  if (!vm) return <StateMessage title="Loading dashboard…" />;
  if (vm.total === 0)
    return (
      <StateMessage title="No trees yet" detail="Add a jambo tree to compare its season status here.">
        <button type="button" className="btn" onClick={() => open()}>
          Add a tree
        </button>
      </StateMessage>
    );

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Dashboard</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Ready to pick now</h3>
        <ReadyNowList entries={vm.readyNow} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Season timeline</h3>
        <SeasonTimeline bands={vm.timeline} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>All trees</h3>
        <StatusTable entries={vm.entries} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Summary</h3>
        <SummaryCharts byStage={vm.byStage} perMonthInSeason={vm.perMonthInSeason} />
      </section>
    </div>
  );
}
