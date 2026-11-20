import { describe, expect, it } from 'vitest';
import { guardShareBreakdown } from './share-guard';

const asked = 'US electricity generation by source';

describe('guardShareBreakdown', () => {
  it('drops total and subtotal rows when the parts are present', () => {
    const guarded = guardShareBreakdown(
      [
        { x: 'Natural gas', y: 43 },
        { x: 'Coal', y: 16 },
        { x: 'Nuclear', y: 18 },
        { x: 'Wind', y: 10 },
        { x: 'Hydro', y: 6 },
        { x: 'Solar', y: 4 },
        { x: 'Petroleum', y: 3 },
        { x: 'Renewables, total', y: 20 },
        { x: 'Solar, total', y: 4 },
        { x: 'Petroleum, total', y: 3 },
        { x: 'All sources', y: 100 },
      ],
      { asked, yLabel: 'Share %' }
    );
    expect(guarded.ok).toBe(true);
    if (!guarded.ok) {
      return;
    }
    const names = guarded.rows.map((row) => String(row.x));
    expect(names).toContain('Wind');
    expect(names.join(' ').toLowerCase()).not.toMatch(/\btotal\b|\ball\b|\boverall\b/);
    const sum = guarded.rows.reduce((total, row) => total + Number(row.y), 0);
    expect(sum).toBeGreaterThanOrEqual(95);
    expect(sum).toBeLessThanOrEqual(105);
  });

  it('refuses a share mix that still adds up outside 95 to 105 percent', () => {
    const guarded = guardShareBreakdown(
      [
        { x: 'Natural gas', y: 43 },
        { x: 'Coal', y: 16 },
        { x: 'Nuclear', y: 18 },
        { x: 'Solar', y: 20 },
        { x: 'Petroleum', y: 14 },
      ],
      { asked, yLabel: 'Share %' }
    );
    expect(guarded.ok).toBe(false);
    if (guarded.ok) {
      return;
    }
    expect(guarded.error).toMatch(/111%/);
    expect(guarded.error.toLowerCase()).toMatch(/not a complete mix/);
  });

  it('leaves a time series and a rate ranking alone', () => {
    const years = guardShareBreakdown(
      [
        { x: '2005', y: 12, series: 'Germany' },
        { x: '2023', y: 22, series: 'Germany' },
      ],
      { asked: 'renewables share Germany since 2005', yLabel: 'Share %' }
    );
    expect(years).toEqual({
      ok: true,
      rows: [
        { x: '2005', y: 12, series: 'Germany' },
        { x: '2023', y: 22, series: 'Germany' },
      ],
    });
    const ranking = guardShareBreakdown(
      [
        { x: 'Spain', y: 20 },
        { x: 'Germany', y: 12 },
        { x: 'France', y: 11 },
      ],
      { asked: 'solar share top 10', yLabel: 'Solar share %' }
    );
    expect(ranking.ok).toBe(true);
    if (!ranking.ok) {
      return;
    }
    expect(ranking.rows).toHaveLength(3);
  });
});
