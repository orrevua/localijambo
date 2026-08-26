import { describe, it, expect } from 'vitest';
import { classifyAccuracy } from './geo.ts';

describe('classifyAccuracy', () => {
  it('is green at or below 15 m', () => {
    expect(classifyAccuracy(0)).toBe('green');
    expect(classifyAccuracy(15)).toBe('green');
  });

  it('is amber above 15 m up to 40 m', () => {
    expect(classifyAccuracy(15.0001)).toBe('amber');
    expect(classifyAccuracy(30)).toBe('amber');
    expect(classifyAccuracy(40)).toBe('amber');
  });

  it('is red above 40 m', () => {
    expect(classifyAccuracy(40.0001)).toBe('red');
    expect(classifyAccuracy(100)).toBe('red');
  });
});
