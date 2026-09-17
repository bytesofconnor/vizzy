import { describe, expect, it } from 'vitest';
import { tryLocalRevision } from './revision-apply';
import type { ChartSeed } from './seed';

function seed(rows: Array<{ x: string | number; y: number }>): ChartSeed {
  return {
    title: 'UN General Assembly Yes Votes on Ukraine',
    kicker: 'Ukraine conflict',
    note: 'Yes votes on selected resolutions.',
    chartType: 'bar',
    area: false,
    xLabel: 'Year',
    yLabel: 'Votes',
    sourceLabel: 'Wikipedia',
    sourceMethod: 'scraped',
    evidence: 'UNGA recorded votes',
    sourceUrl: 'https://en.wikipedia.org/wiki/United_Nations_General_Assembly_Resolution_ES-11/1',
    rows,
  };
}

describe('tryLocalRevision', () => {
  const votes = seed([
    { x: 2014, y: 100 },
    { x: 2022, y: 141 },
    { x: 2023, y: 93 },
    { x: 2025, y: 80 },
    { x: 2026, y: 70 },
  ]);

  it('drops named years without a lookup', () => {
    const next = tryLocalRevision(votes, 'Drop 2025 and 2026.');
    expect(next?.ok).toBe(true);
    if (next?.ok) {
      expect(next.seed.rows.map((row) => row.x)).toEqual([2014, 2022, 2023]);
      expect(next.seed.sourceUrl).toContain('wikipedia');
    }
  });

  it('says so when those years are not on the chart', () => {
    const next = tryLocalRevision(
      seed([
        { x: 2014, y: 100 },
        { x: 2022, y: 141 },
        { x: 2023, y: 93 },
      ]),
      'Drop 2025 and 2026.'
    );
    expect(next?.ok).toBe(false);
    if (next && !next.ok) {
      expect(next.error).toMatch(/doesn't have 2025 or 2026/);
    }
  });

  it('switches to a line in place', () => {
    const next = tryLocalRevision(votes, 'Make it a line chart.');
    expect(next?.ok).toBe(true);
    if (next?.ok) {
      expect(next.seed.chartType).toBe('line');
      expect(next.seed.rows).toHaveLength(5);
    }
  });
});
