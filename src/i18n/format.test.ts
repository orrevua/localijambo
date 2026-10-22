import { describe, it, expect } from 'vitest';
import {
  forecastLabel,
  fruitingOptions,
  humanizeDays,
  ripenessFor,
  ripenessOptions,
} from './format.ts';
import { MESSAGES } from './messages.ts';
import type { FruitingPrediction } from '../lib/phenology.ts';

const { pt, en } = MESSAGES;

function prediction(over: Partial<FruitingPrediction>): FruitingPrediction {
  return {
    stage: 'dormant',
    daysToRipeMin: 0,
    daysToRipeMax: 0,
    daysToRipe: 0,
    label: '',
    inSeason: false,
    confidence: 'calendar',
    windowClosing: false,
    ...over,
  };
}

describe('humanizeDays (localised)', () => {
  it('reads now / days / weeks in English', () => {
    expect(humanizeDays(en, 0)).toBe('now');
    expect(humanizeDays(en, 1)).toBe('~1 day');
    expect(humanizeDays(en, 13)).toBe('~13 days');
    expect(humanizeDays(en, 14)).toBe('~2 weeks');
  });

  it('reads agora / dias / semanas in Portuguese', () => {
    expect(humanizeDays(pt, 0)).toBe('agora');
    expect(humanizeDays(pt, 1)).toBe('~1 dia');
    expect(humanizeDays(pt, 10)).toBe('~10 dias');
    expect(humanizeDays(pt, 70)).toBe('~10 semanas');
  });
});

describe('forecastLabel', () => {
  it('localises the flowering forecast', () => {
    const p = prediction({ stage: 'flowering', daysToRipe: 70 });
    expect(forecastLabel(pt, p)).toContain('Florindo');
    expect(forecastLabel(pt, p)).toContain('~10 semanas');
    expect(forecastLabel(en, p)).toBe('In flower — ~10 weeks to ripe fruit');
  });

  it('says harvest now for observed ripe fruit out of season', () => {
    const p = prediction({ stage: 'harvest', inSeason: false, confidence: 'observed' });
    expect(forecastLabel(en, p)).toBe(en.forecast.harvestNow);
    expect(forecastLabel(pt, p)).toBe(pt.forecast.harvestNow);
  });

  it('falls back to harvest window for a calendar guess out of season', () => {
    const p = prediction({ stage: 'harvest', inSeason: false, confidence: 'calendar' });
    expect(forecastLabel(en, p)).toBe(en.forecast.harvestWindow);
  });

  it('covers the remaining stages', () => {
    expect(forecastLabel(pt, prediction({ stage: 'overripe' }))).toBe(pt.forecast.overripe);
    expect(forecastLabel(en, prediction({ stage: 'dormant' }))).toBe(en.forecast.dormant);
    expect(forecastLabel(en, prediction({ stage: 'developing', daysToRipe: 5 }))).toBe(
      'Green fruit — ~5 days to ripe',
    );
  });
});

describe('ripenessFor', () => {
  it('defaults a newly fruiting tree to unripe', () => {
    expect(ripenessFor('fruiting', 'unknown')).toBe('unripe');
  });

  it('keeps an existing ripeness for fruiting trees', () => {
    expect(ripenessFor('fruiting', 'ripe')).toBe('ripe');
  });

  it('clears ripeness for non-fruiting trees', () => {
    expect(ripenessFor('none', 'ripe')).toBe('unknown');
    expect(ripenessFor('flowering', 'ripening')).toBe('unknown');
  });
});

describe('status options', () => {
  it('lists three fruiting states per language', () => {
    expect(fruitingOptions(en).map((o) => o.label)).toEqual(['Resting', 'Flowering', 'Fruiting']);
    expect(fruitingOptions(pt).map((o) => o.label)).toEqual([
      'Em repouso',
      'Florindo',
      'Com frutos',
    ]);
    expect(fruitingOptions(pt).map((o) => o.value)).toEqual(['none', 'flowering', 'fruiting']);
  });

  it('lists four ripeness states per language', () => {
    expect(ripenessOptions(en)).toHaveLength(4);
    expect(ripenessOptions(pt).map((o) => o.label)).toEqual([
      'Verde',
      'Amadurecendo',
      'Maduro',
      'Passado',
    ]);
    expect(ripenessOptions(en).map((o) => o.value)).toEqual([
      'unripe',
      'ripening',
      'ripe',
      'overripe',
    ]);
  });
});
