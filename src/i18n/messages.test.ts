import { describe, it, expect } from 'vitest';
import { MESSAGES } from './messages.ts';

type Shape = string | { [key: string]: Shape };

// Reduce a messages object to its key structure: leaves become their type
// ('string', 'function', 'array') so both languages must match exactly.
function shape(value: unknown): Shape {
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, shape((value as Record<string, unknown>)[k])]),
    );
  }
  return typeof value;
}

describe('MESSAGES', () => {
  it('pt and en share the same key structure', () => {
    expect(shape(MESSAGES.pt)).toEqual(shape(MESSAGES.en));
  });

  it('has no empty strings', () => {
    const empties: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'string' && v.trim() === '') empties.push(path);
      else if (v && typeof v === 'object')
        for (const [k, child] of Object.entries(v)) walk(child, `${path}.${k}`);
    };
    walk(MESSAGES.pt, 'pt');
    walk(MESSAGES.en, 'en');
    expect(empties).toEqual([]);
  });
});
