import { describe, expect, it } from 'vitest';
import { formatDataValue } from '../format';

describe('formatDataValue', () => {
  it('does not paint a bitcoin amount as a long si suffix', () => {
    expect(formatDataValue(35040.8, [0, 70000])).toBe('35,041');
    expect(formatDataValue(35040.8, [0, 70000])).not.toBe('35.0408k');
  });

  it('keeps a year axis in four digits', () => {
    expect(formatDataValue(1979, [1979, 2023])).toBe('1979');
    expect(formatDataValue(2000, [1979, 2023])).toBe('2000');
    expect(formatDataValue(2023, [1979, 2023])).toBe('2023');
  });

  it('compacts millions without a six-digit si tail', () => {
    expect(formatDataValue(1_500_000, [0, 2_000_000])).toBe('1.5M');
    expect(formatDataValue(8_091_000_000, [0, 9_000_000_000])).toBe('8.09B');
  });

  it('turns a dollar-millions series of 5,000,000 into about $5T', () => {
    const domain: [number, number] = [0, 45_000_000];
    const unit = 'Federal debt ($ millions)';
    expect(formatDataValue(5_000_000, domain, unit)).toBe('$5T');
    expect(formatDataValue(45_000_000, domain, unit)).toBe('$45T');
  });

  it('uses one precision for every label in the chart', () => {
    const domain: [number, number] = [0, 12_000];
    const labels = [formatDataValue(10_613, domain), formatDataValue(973.7, domain)];
    const places = labels.map((label) => {
      const dot = label.indexOf('.');
      return dot < 0 ? 0 : label.length - dot - 1;
    });
    expect(new Set(places).size).toBe(1);
    expect(labels).toEqual(['10,613', '974']);
  });
});
