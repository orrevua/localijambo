import { describe, it, expect } from 'vitest';
import { buildTreeStats } from './treeStats.ts';
import type { Tree, FruitingStatus, Ripeness } from '../types/tree.ts';

function makeTree(over: Partial<Tree> = {}): Tree {
  return {
    id: over.id ?? crypto.randomUUID(),
    clientId: over.clientId ?? crypto.randomUUID(),
    ownerId: 'owner-1',
    lon: -34.9,
    lat: -8.05,
    species: 'Syzygium malaccense',
    fruitingStatus: (over.fruitingStatus ?? 'none') as FruitingStatus,
    ripeness: (over.ripeness ?? 'unknown') as Ripeness,
    isShared: over.isShared ?? false,
    createdAt: over.createdAt ?? '2025-12-01T00:00:00.000Z',
    updatedAt: over.updatedAt ?? '2025-12-01T00:00:00.000Z',
    ...over,
  };
}

// January is inside HARVEST_WINDOW (Dec–May).
const NOW = new Date('2026-01-15T12:00:00');

describe('buildTreeStats', () => {
  it('handles an empty input', () => {
    const vm = buildTreeStats([], NOW);
    expect(vm.total).toBe(0);
    expect(vm.readyNow).toEqual([]);
    expect(vm.upcoming).toEqual([]);
    expect(vm.perMonthInSeason).toHaveLength(12);
    expect(vm.byStage).toHaveLength(6);
    expect(vm.byRipeness.unknown).toBe(0);
  });

  it('counts shared vs private and status/ripeness', () => {
    const vm = buildTreeStats(
      [
        makeTree({ isShared: true, fruitingStatus: 'fruiting', ripeness: 'ripe' }),
        makeTree({ isShared: false, fruitingStatus: 'flowering', ripeness: 'unknown' }),
        makeTree({ isShared: false, fruitingStatus: 'none', ripeness: 'unknown' }),
      ],
      NOW,
    );
    expect(vm.total).toBe(3);
    expect(vm.sharedCount).toBe(1);
    expect(vm.privateCount).toBe(2);
    expect(vm.byFruitingStatus.fruiting).toBe(1);
    expect(vm.byFruitingStatus.none).toBe(1);
    expect(vm.byRipeness.ripe).toBe(1);
    expect(vm.byRipeness.unknown).toBe(2);
  });

  it('puts ripe trees in readyNow, soonest/most-recent first', () => {
    const older = makeTree({
      fruitingStatus: 'fruiting',
      ripeness: 'ripe',
      updatedAt: '2026-01-05T00:00:00.000Z',
    });
    const fresher = makeTree({
      fruitingStatus: 'fruiting',
      ripeness: 'ripe',
      updatedAt: '2026-01-14T00:00:00.000Z',
    });
    const vm = buildTreeStats([older, fresher], NOW);
    expect(vm.readyNowCount).toBe(2);
    // both have daysToRipe 0; tie broken by most-recent observation first
    expect(vm.readyNow[0].tree.id).toBe(fresher.id);
    expect(vm.readyNow.every((e) => e.daysToRipe === 0)).toBe(true);
  });

  it('sorts upcoming (non-ready) by soonest days-to-ripe', () => {
    const flowering = makeTree({
      fruitingStatus: 'flowering',
      updatedAt: '2026-01-14T00:00:00.000Z',
    }); // ~70d
    const unripe = makeTree({
      fruitingStatus: 'fruiting',
      ripeness: 'unripe',
      updatedAt: '2026-01-14T00:00:00.000Z',
    }); // ~45d
    const vm = buildTreeStats([flowering, unripe], NOW);
    expect(vm.upcoming[0].tree.id).toBe(unripe.id);
    expect(vm.upcoming[0].daysToRipe).toBeLessThan(vm.upcoming[1].daysToRipe);
  });

  it('counts in-season trees for a harvest month', () => {
    const vm = buildTreeStats([makeTree(), makeTree()], NOW);
    expect(vm.inSeasonNowCount).toBe(2); // January ∈ Dec–May
  });

  it('builds a 12-month timeline with year-wrapping harvest months', () => {
    const vm = buildTreeStats([makeTree()], NOW);
    const band = vm.timeline[0];
    // HARVEST_WINDOW is Dec–May (wraps the year): includes Jan, Feb, Dec; excludes Jul.
    expect(band.harvestMonths).toContain(1);
    expect(band.harvestMonths).toContain(12);
    expect(band.harvestMonths).not.toContain(7);
    // FLOWERING_WINDOW Aug–Feb: includes Aug and Jan, excludes May.
    expect(band.floweringMonths).toContain(8);
    expect(band.floweringMonths).not.toContain(5);
  });

  it('flags a stale observation', () => {
    const stale = makeTree({
      fruitingStatus: 'flowering',
      updatedAt: '2025-06-01T00:00:00.000Z', // >80 days before NOW
    });
    const vm = buildTreeStats([stale], NOW);
    expect(vm.entries[0].stale).toBe(true);
    expect(vm.entries[0].prediction.confidence).toBe('calendar');
  });

  it('marks unparsable updatedAt as stale with null lastObservedDays', () => {
    const vm = buildTreeStats([makeTree({ updatedAt: 'not-a-date' })], NOW);
    expect(vm.entries[0].lastObservedDays).toBeNull();
    expect(vm.entries[0].stale).toBe(true);
  });
});
