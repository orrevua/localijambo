import type { FruitingPrediction } from '../lib/phenology.ts';
import type { FruitingStatus, Ripeness } from '../types/tree.ts';
import type { Messages } from './messages.ts';

/** Localised version of phenology's humanizeDays. */
export function humanizeDays(t: Messages, days: number): string {
  if (days <= 0) return t.time.now;
  if (days < 14) return t.time.days(days);
  return t.time.weeks(Math.round(days / 7));
}

/** Localised forecast summary, mirroring phenology's English `label`. */
export function forecastLabel(t: Messages, p: FruitingPrediction): string {
  const d = humanizeDays(t, p.daysToRipe);
  switch (p.stage) {
    case 'flowering':
      return t.forecast.flowering(d);
    case 'developing':
      return t.forecast.developing(d);
    case 'ripening':
      return t.forecast.ripening(d);
    case 'harvest':
      return p.inSeason || p.confidence === 'observed'
        ? t.forecast.harvestNow
        : t.forecast.harvestWindow;
    case 'overripe':
      return t.forecast.overripe;
    default:
      return t.forecast.dormant;
  }
}

export function fruitingOptions(t: Messages): { value: FruitingStatus; label: string }[] {
  return [
    { value: 'none', label: t.form.resting },
    { value: 'flowering', label: t.form.flowering },
    { value: 'fruiting', label: t.form.fruiting },
  ];
}

export function ripenessOptions(t: Messages): { value: Ripeness; label: string }[] {
  return [
    { value: 'unripe', label: t.form.unripe },
    { value: 'ripening', label: t.form.ripening },
    { value: 'ripe', label: t.form.ripe },
    { value: 'overripe', label: t.form.overripe },
  ];
}

/** Ripeness to pair with a new fruiting status (only fruiting trees have one). */
export function ripenessFor(status: FruitingStatus, current: Ripeness): Ripeness {
  if (status !== 'fruiting') return 'unknown';
  return current === 'unknown' ? 'unripe' : current;
}
