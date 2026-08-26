import { describe, it, expect } from 'vitest';
import {
  daysBetween,
  daysUntilWindowOpens,
  humanizeDays,
  localDay,
  monthInWindow,
  predictFruiting,
  FLOWERING_WINDOW,
  HARVEST_WINDOW,
  GREEN_FRUIT_WINDOW,
} from './phenology.ts';
import type { FruitingStatus, Ripeness, Tree } from '../types/tree.ts';

function makeTree(
  fruitingStatus: FruitingStatus,
  ripeness: Ripeness,
  updatedAt: string | undefined,
): Tree {
  return {
    id: 't1',
    clientId: 'c1',
    ownerId: 'o1',
    lon: -35,
    lat: -8,
    species: 'Syzygium malaccense',
    fruitingStatus,
    ripeness,
    isShared: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: updatedAt as string,
  };
}

// Local-time midnight avoids timezone drift when parsing back into localDay.
function isoLocal(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

describe('localDay', () => {
  it('reduces a Date to local year/month/day (1-based month)', () => {
    expect(localDay(new Date(2026, 7, 25))).toEqual({ year: 2026, month: 8, day: 25 });
  });
});

describe('daysBetween', () => {
  it('is zero for the same day', () => {
    const d = { year: 2026, month: 8, day: 25 };
    expect(daysBetween(d, d)).toBe(0);
  });

  it('counts whole days forward', () => {
    expect(daysBetween({ year: 2026, month: 8, day: 1 }, { year: 2026, month: 8, day: 31 })).toBe(30);
  });

  it('handles cross-year diffs', () => {
    expect(daysBetween({ year: 2025, month: 12, day: 31 }, { year: 2026, month: 1, day: 1 })).toBe(1);
  });

  it('is negative when b precedes a', () => {
    expect(daysBetween({ year: 2026, month: 8, day: 10 }, { year: 2026, month: 8, day: 1 })).toBe(-9);
  });
});

describe('monthInWindow', () => {
  it('handles a non-wrapping window (Jan–Feb)', () => {
    expect(monthInWindow(1, HARVEST_WINDOW)).toBe(true);
    expect(monthInWindow(6, HARVEST_WINDOW)).toBe(false);
  });

  it('handles a year-wrapping window (Aug–Feb flowering)', () => {
    expect(monthInWindow(8, FLOWERING_WINDOW)).toBe(true);
    expect(monthInWindow(2, FLOWERING_WINDOW)).toBe(true);
    expect(monthInWindow(12, FLOWERING_WINDOW)).toBe(true);
    expect(monthInWindow(3, FLOWERING_WINDOW)).toBe(false);
    expect(monthInWindow(7, FLOWERING_WINDOW)).toBe(false);
  });

  it('handles harvest boundaries Dec and May', () => {
    expect(monthInWindow(12, HARVEST_WINDOW)).toBe(true);
    expect(monthInWindow(5, HARVEST_WINDOW)).toBe(true);
    expect(monthInWindow(6, HARVEST_WINDOW)).toBe(false);
  });

  it('handles the green-fruit wrapping window (Oct–Jan)', () => {
    expect(monthInWindow(10, GREEN_FRUIT_WINDOW)).toBe(true);
    expect(monthInWindow(1, GREEN_FRUIT_WINDOW)).toBe(true);
    expect(monthInWindow(2, GREEN_FRUIT_WINDOW)).toBe(false);
  });
});

describe('daysUntilWindowOpens', () => {
  it('is zero when already inside the window', () => {
    expect(daysUntilWindowOpens(FLOWERING_WINDOW, { year: 2026, month: 8, day: 15 })).toBe(0);
    expect(daysUntilWindowOpens(FLOWERING_WINDOW, { year: 2026, month: 1, day: 15 })).toBe(0);
  });

  it('measures forward distance to the window start', () => {
    // July 1 -> Aug 1 opening = 31 days
    expect(daysUntilWindowOpens(FLOWERING_WINDOW, { year: 2026, month: 7, day: 1 })).toBe(31);
  });

  it('rolls to next year when start month has passed', () => {
    // Aug window, sitting in June: opens Aug 1 same year.
    expect(daysUntilWindowOpens(FLOWERING_WINDOW, { year: 2026, month: 6, day: 1 })).toBe(61);
  });
});

describe('humanizeDays', () => {
  it('says now for zero or negative', () => {
    expect(humanizeDays(0)).toBe('now');
    expect(humanizeDays(-5)).toBe('now');
  });

  it('reports days under ten', () => {
    expect(humanizeDays(1)).toBe('~1 day');
    expect(humanizeDays(5)).toBe('~5 days');
  });

  it('reports weeks', () => {
    expect(humanizeDays(14)).toBe('~2 weeks');
    expect(humanizeDays(70)).toBe('~10 weeks');
    expect(humanizeDays(140)).toBe('~20 weeks');
  });
});

describe('predictFruiting — observation-anchored branch', () => {
  const now = new Date(2026, 10, 15); // Nov 15, inside harvest? No — harvest is Dec–May.

  it('flowering, fresh observation -> ~70 days remaining', () => {
    const tree = makeTree('flowering', 'unknown', isoLocal(2026, 11, 15));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('flowering');
    expect(p.confidence).toBe('observed');
    expect(p.daysToRipeMin).toBe(60);
    expect(p.daysToRipeMax).toBe(80);
    expect(p.windowClosing).toBe(false);
    expect(p.label).toContain('In flower');
  });

  it('fruiting + unripe -> ~45 days remaining', () => {
    const tree = makeTree('fruiting', 'unripe', isoLocal(2026, 11, 15));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('developing');
    expect(p.confidence).toBe('observed');
    expect(p.daysToRipeMin).toBe(35);
    expect(p.daysToRipeMax).toBe(55);
  });

  it('fruiting + ripening -> ~15 days remaining', () => {
    const tree = makeTree('fruiting', 'ripening', isoLocal(2026, 11, 15));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('ripening');
    expect(p.daysToRipeMin).toBe(7);
    expect(p.daysToRipeMax).toBe(25);
  });

  it('fruiting + ripe -> harvest now, zero days', () => {
    const tree = makeTree('fruiting', 'ripe', isoLocal(2026, 11, 15));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('harvest');
    expect(p.daysToRipeMin).toBe(0);
    expect(p.daysToRipeMax).toBe(0);
    expect(p.confidence).toBe('observed');
    expect(p.windowClosing).toBe(false);
  });

  it('fruiting + overripe -> windowClosing, zero days', () => {
    const tree = makeTree('fruiting', 'overripe', isoLocal(2026, 11, 15));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('overripe');
    expect(p.daysToRipeMin).toBe(0);
    expect(p.daysToRipeMax).toBe(0);
    expect(p.windowClosing).toBe(true);
    expect(p.confidence).toBe('observed');
    expect(p.label).toBe('Past peak — harvest window closing');
  });

  it('ages the estimate forward as time elapses', () => {
    const tree = makeTree('flowering', 'unknown', isoLocal(2026, 10, 16)); // 30 days before now
    const p = predictFruiting(tree, now);
    expect(p.daysToRipeMin).toBe(30); // 60 - 30
    expect(p.daysToRipeMax).toBe(50); // 80 - 30
  });

  it('clamps aged-forward negatives to zero', () => {
    // ripening observed 30 days ago: max 25 - 30 -> 0
    const tree = makeTree('fruiting', 'ripening', isoLocal(2026, 10, 16));
    const p = predictFruiting(tree, now);
    expect(p.daysToRipeMin).toBe(0);
    expect(p.daysToRipeMax).toBe(0);
  });

  it('clamps a future observation to zero elapsed', () => {
    const tree = makeTree('flowering', 'unknown', isoLocal(2026, 12, 1)); // after now
    const p = predictFruiting(tree, now);
    expect(p.daysToRipeMin).toBe(60);
    expect(p.daysToRipeMax).toBe(80);
    expect(p.confidence).toBe('observed');
  });
});

describe('predictFruiting — calendar-fallback branch', () => {
  it('falls back for status none', () => {
    const now = new Date(2026, 6, 1); // July — outside all windows
    const tree = makeTree('none', 'unknown', isoLocal(2026, 6, 30));
    const p = predictFruiting(tree, now);
    expect(p.confidence).toBe('calendar');
    expect(p.stage).toBe('dormant');
    expect(p.inSeason).toBe(false);
    expect(p.label).toContain('Out of season');
  });

  it('falls back for a stale observation (older than threshold)', () => {
    const now = new Date(2026, 6, 1); // July
    const tree = makeTree('flowering', 'unknown', isoLocal(2026, 1, 1)); // ~181 days old
    const p = predictFruiting(tree, now);
    expect(p.confidence).toBe('calendar');
    expect(p.stage).toBe('dormant');
  });

  it('falls back when updatedAt is missing', () => {
    const now = new Date(2026, 6, 1); // July
    const tree = makeTree('flowering', 'unknown', undefined);
    const p = predictFruiting(tree, now);
    expect(p.confidence).toBe('calendar');
    expect(p.stage).toBe('dormant');
  });

  it('falls back when updatedAt is unparseable', () => {
    const now = new Date(2026, 6, 1); // July
    const tree = makeTree('flowering', 'unknown', 'not-a-date');
    const p = predictFruiting(tree, now);
    expect(p.confidence).toBe('calendar');
    expect(p.stage).toBe('dormant');
  });

  it('classifies August as flowering', () => {
    const now = new Date(2026, 7, 10); // Aug
    const tree = makeTree('none', 'unknown', isoLocal(2026, 8, 9));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('flowering');
    expect(p.confidence).toBe('calendar');
    expect(p.label).toContain('In flower');
  });

  it('classifies December as harvest and in-season', () => {
    const now = new Date(2026, 11, 5); // Dec
    const tree = makeTree('none', 'unknown', isoLocal(2026, 12, 4));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('harvest');
    expect(p.inSeason).toBe(true);
    expect(p.daysToRipeMin).toBe(0);
  });

  it('classifies May as harvest boundary (in-season)', () => {
    const now = new Date(2026, 4, 20); // May
    const tree = makeTree('none', 'unknown', isoLocal(2026, 5, 19));
    const p = predictFruiting(tree, now);
    expect(p.stage).toBe('harvest');
    expect(p.inSeason).toBe(true);
  });

  it('classifies February as flowering (harvest ended, still in bloom window)', () => {
    const now = new Date(2026, 1, 15); // Feb
    const tree = makeTree('none', 'unknown', isoLocal(2026, 2, 14));
    const p = predictFruiting(tree, now);
    // Feb is in both flowering and harvest windows; harvest takes precedence.
    expect(p.stage).toBe('harvest');
    expect(p.inSeason).toBe(true);
  });
});
