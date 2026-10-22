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
import { useI18n } from '../../i18n/useI18n.ts';
import styles from './Dashboard.module.css';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { open } = useAddTreeModal();
  const { t } = useI18n();
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
        if (active) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (error) return <StateMessage tone="error" title={t.dashboard.loadError} detail={error} />;
  if (!vm) return <StateMessage title={t.dashboard.loading} />;
  if (vm.total === 0)
    return (
      <StateMessage title={t.dashboard.empty} detail={t.dashboard.emptyDetail}>
        <button type="button" className="btn" onClick={() => open()}>
          {t.nav.add}
        </button>
      </StateMessage>
    );

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>{t.dashboard.title}</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t.dashboard.ready}</h3>
        <ReadyNowList entries={vm.readyNow} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t.dashboard.timeline}</h3>
        <SeasonTimeline bands={vm.timeline} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t.dashboard.allTrees}</h3>
        <StatusTable entries={vm.entries} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t.dashboard.summary}</h3>
        <SummaryCharts byStage={vm.byStage} perMonthInSeason={vm.perMonthInSeason} />
      </section>
    </div>
  );
}
