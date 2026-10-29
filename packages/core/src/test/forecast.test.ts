import { describe, expect, it } from 'vitest';
import { forecastStartIndex } from '../forecast';

describe('forecastStartIndex', () => {
  const now = new Date('2026-09-12T12:00:00Z');

  it('leaves a yearless month cycle solid', () => {
    const rows = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].map((month) => ({ month, value: 1 }));

    expect(forecastStartIndex(rows, 'month', undefined, now)).toBe(-1);
    expect(forecastStartIndex(rows, 'month', undefined, new Date('2026-10-29T12:00:00Z'))).toBe(-1);
  });

  it('dashes months after today when the labels carry the open year', () => {
    const rows = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].map((month) => ({ month: `${month} 2026`, value: 1 }));

    expect(forecastStartIndex(rows, 'month', undefined, new Date('2026-10-29T12:00:00Z'))).toBe(10);
  });

  it('leaves a finished calendar year solid', () => {
    const rows = [
      'Jan 2020', 'Feb 2020', 'Mar 2020', 'Apr 2020', 'May 2020', 'Jun 2020',
      'Jul 2020', 'Aug 2020', 'Sep 2020', 'Oct 2020', 'Nov 2020', 'Dec 2020',
    ].map((month) => ({ month, value: 1 }));

    expect(forecastStartIndex(rows, 'month', undefined, now)).toBe(-1);
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
