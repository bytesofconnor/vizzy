import { describe, expect, it } from 'vitest';
import {
  applyPastedNumberSeries,
  expandShortPrompt,
  fitChartType,
  lookupFoundSeries,
  pastedNumberSeries,
} from './compose-guards';

describe('lookupFoundSeries', () => {
  it('ignores a search snippet without a table', () => {
    expect(lookupFoundSeries('Wikipedia has an article. See tigers.')).toBe(false);
  });

  it('accepts a markdown table with numbers', () => {
    const notes = [
      '| Name | Count |',
      '| --- | --- |',
      '| Japan | 42 |',
      '| Brazil | 31 |',
      '| Kenya | 22 |',
      '| Spain | 18 |',
    ].join('\n');
    expect(lookupFoundSeries(notes)).toBe(true);
  });
});

describe('pastedNumberSeries', () => {
  it('reads chart this: 12, 15, 14, 18', () => {
    expect(pastedNumberSeries('chart this: 12, 15, 14, 18')).toEqual([12, 15, 14, 18]);
  });

  it('reads month labels', () => {
    expect(pastedNumberSeries('Revenue by month from this table: Jan 12 Feb 15 Mar 14 Apr 18')).toEqual([
      12, 15, 14, 18,
    ]);
  });

  it('does not treat year-value NOAA pairs as a paste list', () => {
    expect(
      pastedNumberSeries('Use NOAA ozone DU: 1980 2000, 1990 1800, 2000 1200, 2010 1100, 2020 1000')
    ).toBeUndefined();
  });
});

describe('applyPastedNumberSeries', () => {
  it('puts the typed y values back on the rows', () => {
    const rows = [
      { x: 'Jan', y: 100 },
      { x: 'Feb', y: 101 },
      { x: 'Mar', y: 102 },
      { x: 'Apr', y: 103 },
    ];
    expect(applyPastedNumberSeries(rows, [12, 15, 14, 18]).map((row) => row.y)).toEqual([
      12, 15, 14, 18,
    ]);
  });
});

describe('fitChartType', () => {
  it('turns a yearly bar into a line', () => {
    const rows = [2018, 2019, 2020, 2021, 2022, 2023].map((x, i) => ({ x, y: i }));
    expect(fitChartType('bar', rows, 'Antarctic ozone hole peak area by year since 1980 as a line')).toBe(
      'line'
    );
  });

  it('keeps a named ranking as a bar', () => {
    const rows = ['Japan', 'Brazil', 'Kenya', 'Spain'].map((x, i) => ({ x, y: i }));
    expect(fitChartType('line', rows, 'Deadliest volcanic eruptions ranked by lives lost')).toBe('bar');
  });
});

describe('expandShortPrompt', () => {
  it('adds a family hint to slang', () => {
    const expanded = expandShortPrompt('ozone hole working??');
    expect(expanded).toContain('ozone hole working??');
    expect(expanded).toMatch(/line/i);
  });

  it('leaves a full sentence alone', () => {
    const asked = 'Antarctic ozone hole peak area by year since 1980 as a line';
    expect(expandShortPrompt(asked)).toBe(asked);
  });
});
