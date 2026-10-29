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
});
