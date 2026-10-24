import { describe, expect, it } from 'vitest';
import { mintDraft } from './from-prompt';

const BABY_NOTES = [
  '| Name | Sex | Births |',
  '| --- | --- | --- |',
  '| Liam | M | 20802 |',
  '| Noah | M | 18965 |',
  '| Olivia | F | 15270 |',
  '| Emma | F | 13527 |',
].join('\n');

function draft(overrides: {
  title: string;
  yLabel: string;
  rows: Array<{ x: string; y: number }>;
  notes: string;
  chartType?: 'bar' | 'line' | 'scatter';
}) {
  return {
    output: {
      title: overrides.title,
      kicker: 'Chart',
      note: 'Published figures.',
      chartType: overrides.chartType ?? 'bar',
      area: false,
      xLabel: 'Name',
      yLabel: overrides.yLabel,
      sourceLabel: 'Public table',
      sourceMethod: 'scraped' as const,
      evidence: 'Rows copied from the looked-up table.',
      rows: overrides.rows,
    },
    gathered: {
      notes: overrides.notes,
      urls: ['https://www.ssa.gov/oact/babynames/'],
    },
  };
}

describe('chart encoding', () => {
  it('does not draw baby-name rank as bar height, and says the sexes are mixed', () => {
    const { output, gathered } = draft({
      title: 'Most popular baby names in the US 2023',
      yLabel: 'Rank',
      notes: BABY_NOTES,
      rows: [
        { x: 'Olivia', y: 1 },
        { x: 'Emma', y: 2 },
        { x: 'Liam', y: 1 },
        { x: 'Noah', y: 2 },
      ],
    });
    const minted = mintDraft('Most popular baby names in the US 2023', gathered, output);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const heights = minted.piece.data.map((row) => Number(row.y));
    expect(heights).toEqual([15270, 13527, 20802, 18965]);
    const visible = `${minted.piece.note} ${minted.piece.data.map((row) => String(row.x)).join(' ')}`;
    expect(visible).toMatch(/boys and girls are mixed/i);
  });

  it('does not treat a country name as a second unit', () => {
    const { output, gathered } = draft({
      title: 'Unemployment rate by country',
      yLabel: 'Unemployment rate',
      notes: 'Rates by country.',
      rows: [
        { x: "People's Republic of China", y: 5.2 },
        { x: 'Japan', y: 2.6 },
        { x: 'Germany', y: 3.1 },
        { x: 'Brazil', y: 4.4 },
      ],
    });
    const minted = mintDraft('Unemployment rate by country', gathered, output);
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.data).toHaveLength(4);
    }
  });

  it('keeps one rate on the axis', () => {
    const { output, gathered } = draft({
      title: 'US unemployment rate',
      yLabel: 'Unemployment rate',
      chartType: 'line',
      notes: 'Monthly rate.',
      rows: [
        { x: '2020', y: 8.1 },
        { x: '2021', y: 5.4 },
        { x: '2022', y: 3.6 },
        { x: '2023', y: 3.6 },
      ],
    });
    const minted = mintDraft('US unemployment rate', gathered, output);
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.data.map((row) => Number(row.y))).toEqual([8.1, 5.4, 3.6, 3.6]);
      expect(minted.piece.config.axes.y.label).toBe('Unemployment rate');
    }
  });

  it('does not put a rate and a count on one axis', () => {
    const { output, gathered } = draft({
      title: 'Is the economy doing better?',
      yLabel: 'Unemployment rate and payroll jobs',
      notes: 'No single table.',
      rows: [
        { x: 'Unemployment rate', y: 4.2 },
        { x: 'Payroll jobs', y: 158200 },
      ],
    });
    const minted = mintDraft('Is the economy doing better?', gathered, output);
    if (!minted.ok) {
      expect(minted.error.length).toBeGreaterThan(0);
      return;
    }
    const text = [
      minted.piece.config.axes.y.label ?? '',
      ...minted.piece.data.map((row) => String(row.x)),
    ].join(' ');
    const rate = /\brate\b|%/i.test(text);
    const count = /\b(jobs|payrolls?|counts?)\b/i.test(text);
    expect(rate && count).toBe(false);
  });
});
