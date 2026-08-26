import type { FruitingStatus, Ripeness, Tree } from '../types/tree.ts';
import {
  predictFruiting,
  monthInWindow,
  localDay,
  daysBetween,
  STALE_THRESHOLD_DAYS,
  FLOWERING_WINDOW,
  HARVEST_WINDOW,
  HARVEST_PEAK,
} from './phenology.ts';
import type { FruitingPrediction, PhenologyStage } from './phenology.ts';

export interface TreeStatEntry {
  tree: Tree;
  prediction: FruitingPrediction;
  daysToRipe: number; // = prediction.daysToRipeMin (sort key)
  inSeasonNow: boolean;
  readyNow: boolean; // stage 'harvest' || 'overripe' (fruit available)
  lastObservedDays: number | null; // whole days since updatedAt; null if unparsable
  stale: boolean;
}

export interface StageCount {
  stage: PhenologyStage;
  count: number;
}

export interface MonthCount {
  month: number; // 1-12
  count: number; // trees whose harvest window covers this month
}

export interface TimelineBand {
  tree: Tree;
  floweringMonths: number[];
  harvestMonths: number[];
  peakMonths: number[];
}

export interface TreeStatsVM {
  total: number;
  sharedCount: number;
  privateCount: number;
  byFruitingStatus: Record<FruitingStatus, number>;
  byRipeness: Record<Ripeness, number>;
  byStage: StageCount[];
  inSeasonNowCount: number;
  readyNowCount: number;
  perMonthInSeason: MonthCount[];
  entries: TreeStatEntry[];
  readyNow: TreeStatEntry[];
  upcoming: TreeStatEntry[];
  timeline: TimelineBand[];
}

const STAGE_ORDER: PhenologyStage[] = [
  'dormant',
  'flowering',
  'developing',
  'ripening',
  'harvest',
  'overripe',
];

const FRUITING_STATUSES: FruitingStatus[] = ['none', 'flowering', 'fruiting'];
const RIPENESS_VALUES: Ripeness[] = ['unknown', 'unripe', 'ripening', 'ripe', 'overripe'];

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function observedDays(tree: Tree, now: Date): number | null {
  if (!tree.updatedAt) return null;
  const parsed = new Date(tree.updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, daysBetween(localDay(parsed), localDay(now)));
}

/** Sort by soonest possible harvest, then most recently observed. Pure. */
function bySoonest(a: TreeStatEntry, b: TreeStatEntry): number {
  if (a.daysToRipe !== b.daysToRipe) return a.daysToRipe - b.daysToRipe;
  return b.tree.updatedAt.localeCompare(a.tree.updatedAt);
}

function monthsIn(window: typeof HARVEST_WINDOW): number[] {
  return MONTHS.filter((m) => monthInWindow(m, window));
}

export function buildTreeStats(trees: Tree[], now: Date): TreeStatsVM {
  const byFruitingStatus = Object.fromEntries(
    FRUITING_STATUSES.map((s) => [s, 0]),
  ) as Record<FruitingStatus, number>;
  const byRipeness = Object.fromEntries(RIPENESS_VALUES.map((r) => [r, 0])) as Record<
    Ripeness,
    number
  >;
  const stageCounts = new Map<PhenologyStage, number>(STAGE_ORDER.map((s) => [s, 0]));

  let sharedCount = 0;
  const entries: TreeStatEntry[] = trees.map((tree) => {
    const prediction = predictFruiting(tree, now);
    const readyNow = prediction.stage === 'harvest' || prediction.stage === 'overripe';
    const lastObservedDays = observedDays(tree, now);

    byFruitingStatus[tree.fruitingStatus] += 1;
    byRipeness[tree.ripeness] += 1;
    stageCounts.set(prediction.stage, (stageCounts.get(prediction.stage) ?? 0) + 1);
    if (tree.isShared) sharedCount += 1;

    return {
      tree,
      prediction,
      daysToRipe: prediction.daysToRipeMin,
      inSeasonNow: prediction.inSeason,
      readyNow,
      lastObservedDays,
      stale: lastObservedDays === null || lastObservedDays > STALE_THRESHOLD_DAYS,
    };
  });

  const readyNow = entries.filter((e) => e.readyNow).sort(bySoonest);
  const upcoming = entries.filter((e) => !e.readyNow).sort(bySoonest);

  // Uniform jambo calendar today, but computed per tree to stay correct if
  // per-tree calendars are ever introduced.
  const floweringMonths = monthsIn(FLOWERING_WINDOW);
  const harvestMonths = monthsIn(HARVEST_WINDOW);
  const peakMonths = monthsIn(HARVEST_PEAK);
  const timeline: TimelineBand[] = trees.map((tree) => ({
    tree,
    floweringMonths,
    harvestMonths,
    peakMonths,
  }));

  const perMonthInSeason: MonthCount[] = MONTHS.map((month) => ({
    month,
    // Uniform jambo calendar today; counted per tree so it stays correct if
    // per-tree calendars are ever introduced.
    count: trees.filter(() => monthInWindow(month, HARVEST_WINDOW)).length,
  }));

  return {
    total: trees.length,
    sharedCount,
    privateCount: trees.length - sharedCount,
    byFruitingStatus,
    byRipeness,
    byStage: STAGE_ORDER.map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 })),
    inSeasonNowCount: entries.filter((e) => e.inSeasonNow).length,
    readyNowCount: readyNow.length,
    perMonthInSeason,
    entries,
    readyNow,
    upcoming,
    timeline,
  };
}
