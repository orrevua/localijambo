import type { Tree } from '../types/tree.ts';

export type PhenologyStage =
  | 'dormant' // outside all windows, no active fruit
  | 'flowering' // in flower
  | 'developing' // green/unripe fruit
  | 'ripening' // fruit coloring toward crimson
  | 'harvest' // ripe fruit available now
  | 'overripe'; // past-peak / window closing

export type PhenologyConfidence = 'observed' | 'calendar';

export interface FruitingPrediction {
  stage: PhenologyStage;
  daysToRipeMin: number; // clamped >= 0
  daysToRipeMax: number; // clamped >= 0
  label: string; // human summary
  inSeason: boolean; // today's month within HARVEST_WINDOW
  confidence: PhenologyConfidence;
  windowClosing: boolean; // true for overripe / past-window cases
}

interface CalendarDay {
  year: number;
  month: number; // 1-12
  day: number;
}

interface MonthWindow {
  start: number; // 1-12
  end: number; // 1-12, inclusive; may wrap the year boundary
}

interface RemainingDays {
  mean: number;
  min: number;
  max: number;
}

// Phenology calendar (Northeast Brazil, single national calendar). Months are 1-based.
export const FLOWERING_WINDOW: MonthWindow = { start: 8, end: 2 }; // Aug–Feb
export const FLOWERING_PEAK: MonthWindow = { start: 9, end: 10 };
export const GREEN_FRUIT_WINDOW: MonthWindow = { start: 10, end: 1 }; // Oct–Jan
export const HARVEST_WINDOW: MonthWindow = { start: 12, end: 5 }; // Dec–May
export const HARVEST_PEAK: MonthWindow = { start: 1, end: 2 };

export const FLOWER_TO_RIPE_MEAN = 70;
export const FLOWER_TO_RIPE_MIN = 60;
export const FLOWER_TO_RIPE_MAX = 80;
export const STALE_THRESHOLD_DAYS = 80; // = FLOWER_TO_RIPE_MAX
export const FLOWERING_OPEN_MONTH = 8;

// Stage-anchored remaining-days-to-ripe, measured from the observation instant.
export const FLOWERING_REMAINING: RemainingDays = { mean: 70, min: 60, max: 80 };
export const UNRIPE_REMAINING: RemainingDays = { mean: 45, min: 35, max: 55 };
export const RIPENING_REMAINING: RemainingDays = { mean: 15, min: 7, max: 25 };

const MS_PER_DAY = 86_400_000;

export function localDay(d: Date): CalendarDay {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function daysBetween(a: CalendarDay, b: CalendarDay): number {
  const aMs = Date.UTC(a.year, a.month - 1, a.day);
  const bMs = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((bMs - aMs) / MS_PER_DAY);
}

export function monthInWindow(month: number, window: MonthWindow): boolean {
  if (window.start <= window.end) {
    return month >= window.start && month <= window.end;
  }
  return month >= window.start || month <= window.end;
}

export function daysUntilWindowOpens(window: MonthWindow, today: CalendarDay): number {
  if (monthInWindow(today.month, window)) return 0;
  let year = today.year;
  if (window.start <= today.month) year += 1;
  const openMs = Date.UTC(year, window.start - 1, 1);
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  return Math.max(0, Math.round((openMs - todayMs) / MS_PER_DAY));
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function humanizeDays(days: number): string {
  if (days <= 0) return 'now';
  if (days < 10) return `~${days} day${days === 1 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  return `~${weeks} weeks`;
}

function clampMin0(n: number): number {
  return n < 0 ? 0 : n;
}

function buildLabel(stage: PhenologyStage, days: number, inSeason: boolean): string {
  const duration = humanizeDays(days);
  switch (stage) {
    case 'flowering':
      return `In flower — ${duration} to ripe fruit`;
    case 'developing':
      return `Green fruit — ${duration} to ripe`;
    case 'ripening':
      return `Ripening — ${duration} to peak`;
    case 'harvest':
      return inSeason ? 'Ripe fruit — harvest now' : 'Harvest window';
    case 'overripe':
      return 'Past peak — harvest window closing';
    case 'dormant':
    default:
      return `Out of season — next bloom ~${MONTH_ABBR[FLOWERING_OPEN_MONTH - 1]}`;
  }
}

const STAGE_REMAINING: Partial<Record<Tree['ripeness'], RemainingDays>> = {
  unripe: UNRIPE_REMAINING,
  ripening: RIPENING_REMAINING,
};

const STAGE_FROM_RIPENESS: Partial<Record<Tree['ripeness'], PhenologyStage>> = {
  unripe: 'developing',
  ripening: 'ripening',
};

function parseObservedDay(updatedAt: string | undefined): CalendarDay | null {
  if (!updatedAt) return null;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return localDay(parsed);
}

export function predictFruiting(tree: Tree, now: Date): FruitingPrediction {
  const today = localDay(now);
  const inSeason = monthInWindow(today.month, HARVEST_WINDOW);

  const observedDay = parseObservedDay(tree.updatedAt);
  const elapsed = observedDay === null ? null : clampMin0(daysBetween(observedDay, today));
  const fresh = elapsed !== null && elapsed <= STALE_THRESHOLD_DAYS;

  if (fresh) {
    if (tree.fruitingStatus === 'flowering') {
      return observedPrediction('flowering', FLOWERING_REMAINING, elapsed, inSeason);
    }

    if (tree.fruitingStatus === 'fruiting') {
      if (tree.ripeness === 'overripe') {
        return {
          stage: 'overripe',
          daysToRipeMin: 0,
          daysToRipeMax: 0,
          label: buildLabel('overripe', 0, inSeason),
          inSeason,
          confidence: 'observed',
          windowClosing: true,
        };
      }

      if (tree.ripeness === 'ripe') {
        return {
          stage: 'harvest',
          daysToRipeMin: 0,
          daysToRipeMax: 0,
          label: buildLabel('harvest', 0, inSeason),
          inSeason,
          confidence: 'observed',
          windowClosing: false,
        };
      }

      const remaining = STAGE_REMAINING[tree.ripeness];
      const stage = STAGE_FROM_RIPENESS[tree.ripeness];
      if (remaining && stage) {
        return observedPrediction(stage, remaining, elapsed, inSeason);
      }
    }
  }

  return calendarPrediction(today, inSeason);
}

function observedPrediction(
  stage: PhenologyStage,
  remaining: RemainingDays,
  elapsed: number,
  inSeason: boolean,
): FruitingPrediction {
  const daysToRipeMean = clampMin0(remaining.mean - elapsed);
  const daysToRipeMin = clampMin0(remaining.min - elapsed);
  const daysToRipeMax = clampMin0(remaining.max - elapsed);
  return {
    stage,
    daysToRipeMin,
    daysToRipeMax,
    label: buildLabel(stage, daysToRipeMean, inSeason),
    inSeason,
    confidence: 'observed',
    windowClosing: false,
  };
}

function calendarPrediction(today: CalendarDay, inSeason: boolean): FruitingPrediction {
  const inFlowering = monthInWindow(today.month, FLOWERING_WINDOW);
  const inHarvest = monthInWindow(today.month, HARVEST_WINDOW);

  if (inHarvest) {
    return {
      stage: 'harvest',
      daysToRipeMin: 0,
      daysToRipeMax: 0,
      label: buildLabel('harvest', 0, inSeason),
      inSeason,
      confidence: 'calendar',
      windowClosing: false,
    };
  }

  const daysToBloom = daysUntilWindowOpens(FLOWERING_WINDOW, today);
  const daysToRipeMean = daysToBloom + FLOWER_TO_RIPE_MEAN;
  const stage: PhenologyStage = inFlowering ? 'flowering' : 'dormant';

  return {
    stage,
    daysToRipeMin: daysToBloom + FLOWER_TO_RIPE_MIN,
    daysToRipeMax: daysToBloom + FLOWER_TO_RIPE_MAX,
    label: buildLabel(stage, daysToRipeMean, inSeason),
    inSeason,
    confidence: 'calendar',
    windowClosing: false,
  };
}
