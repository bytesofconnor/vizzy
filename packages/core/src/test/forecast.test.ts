import { describe, expect, it } from 'vitest';
import { forecastStartIndex } from '../forecast';

describe('forecastStartIndex', () => {
  const now = new Date('2026-09-12T12:00:00Z');

  it('dashes months after today when the year is still open', () => {
    const rows = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].map((month) => ({ month, value: 1 }));

    expect(forecastStartIndex(rows, 'month', undefined, now)).toBe(9);
  });

  it('honors an explicit forecastFrom label', () => {
    const rows = ['Jan', 'Feb', 'Mar', 'Apr'].map((month) => ({ month, value: 1 }));
    expect(forecastStartIndex(rows, 'month', 'Mar', now)).toBe(2);
  });

  it('leaves a finished year solid', () => {
    const rows = ['Jan', 'Feb', 'Mar', 'Apr'].map((month) => ({ month, value: 1 }));
    expect(forecastStartIndex(rows, 'month', undefined, now)).toBe(-1);
  });
});
