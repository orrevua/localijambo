import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth.ts';
import { listMine } from '../../data/treesRepo.ts';
import { buildTreeStats } from '../../lib/treeStats.ts';
import type { TreeStatsVM } from '../../lib/treeStats.ts';
import StateMessage from '../../components/StateMessage.tsx';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import { useI18n } from '../../i18n/useI18n.ts';
import styles from './ProfileScreen.module.css';

export default function ProfileScreen() {
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

  if (!user) return <StateMessage title={t.profile.notSignedIn} />;
  if (error) return <StateMessage tone="error" title={t.profile.loadError} detail={error} />;
  if (!vm) return <StateMessage title={t.profile.loading} />;

  return (
    <div className={styles.screen}>
      <header className={styles.identity}>
        <h2 className={styles.title}>{t.profile.title}</h2>
        <p className={styles.email}>{user.email}</p>
      </header>

      {vm.total === 0 ? (
        <StateMessage title={t.profile.empty} detail={t.profile.emptyDetail}>
          <button type="button" className="btn" onClick={() => open()}>
            {t.nav.add}
          </button>
        </StateMessage>
      ) : (
        <>
          <div className={styles.cards}>
            <Stat label={t.profile.added} value={vm.total} big />
            <Stat label={t.profile.inSeason} value={vm.inSeasonNowCount} />
            <Stat label={t.profile.ready} value={vm.readyNowCount} />
            <Stat label={t.profile.shared} value={vm.sharedCount} />
            <Stat label={t.profile.private} value={vm.privateCount} />
          </div>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t.profile.byFruiting}</h3>
            <dl className={styles.rows}>
              {Object.entries(vm.byFruitingStatus).map(([k, n]) => (
                <div className={styles.row} key={k}>
                  <dt>{t.profile.fruitingValue[k] ?? k}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t.profile.byRipeness}</h3>
            <dl className={styles.rows}>
              {Object.entries(vm.byRipeness).map(([k, n]) => (
                <div className={styles.row} key={k}>
                  <dt>{t.profile.ripenessValue[k] ?? k}</dt>
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
