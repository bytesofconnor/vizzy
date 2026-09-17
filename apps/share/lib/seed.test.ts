import { describe, expect, it } from 'vitest';
import { PIECES } from './pieces';
import {
  followUpNeedsLookup,
  isUnsupportedVizOnlyRevision,
  parseChartSeed,
  revisionYearSpan,
  seedFromPiece,
} from './seed';

describe('followUpNeedsLookup', () => {
  it('treats a through-year revision as needing lookup', () => {
    expect(followUpNeedsLookup('through 2026 pls')).toBe(true);
  });

  it('does not look up years already on the chart', () => {
    const seed = seedFromPiece(PIECES.find((piece) => piece.slug === 'reef')!);
    expect(followUpNeedsLookup('Drop 2025 and 2026.', seed)).toBe(false);
  });

  it('leaves style-only revisions in place', () => {
    expect(followUpNeedsLookup('Make it a line chart.')).toBe(false);
    expect(followUpNeedsLookup('Make it a pictogram.')).toBe(false);
  });

  it('looks up when asked for more years than the chart has', () => {
    const seed = seedFromPiece(PIECES.find((piece) => piece.slug === 'reef')!);
    const short = { ...seed, rows: seed.rows.slice(0, 2) };
    expect(followUpNeedsLookup('make it 10 years', short)).toBe(true);
    expect(followUpNeedsLookup('Make it a line chart.', short)).toBe(false);
  });

  it('looks up a 50-year window the current rows cannot cover', () => {
    const seed = seedFromPiece(PIECES.find((piece) => piece.slug === 'reef')!);
    expect(followUpNeedsLookup('can we see the past 50 years?', seed)).toBe(true);
  });
});

describe('revisionYearSpan', () => {
  it('accepts a 50-year window', () => {
    expect(revisionYearSpan('can we see the past 50 years?')).toBe(50);
    expect(revisionYearSpan('last 10 years')).toBe(10);
  });
});

describe('isUnsupportedVizOnlyRevision', () => {
  it('catches pictogram-only asks', () => {
    expect(isUnsupportedVizOnlyRevision('Make it a pictogram.')).toBe(true);
  });

  it('ignores mixed revisions', () => {
    expect(isUnsupportedVizOnlyRevision('Make it a pictogram and add 2026.')).toBe(false);
  });
});

describe('seedFromPiece', () => {
  it('keeps grouped series on the reef example', () => {
    const reef = PIECES.find((piece) => piece.slug === 'reef');
    expect(reef).toBeTruthy();
    const seed = seedFromPiece(reef!);
    expect(seed.rows.some((row) => row.series === 'Southern')).toBe(true);
    const parsed = parseChartSeed(seed);
    expect(parsed?.rows.some((row) => row.series === 'Northern')).toBe(true);
  });
});

describe('parseChartSeed', () => {
  it('keeps a long yearly series so a 50-year revise can round-trip', () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ x: 1975 + index, y: index }));
    const parsed = parseChartSeed({
      title: 'Acres burned',
      kicker: 'Fire',
      note: 'NIFC',
      chartType: 'line',
      xLabel: 'Year',
      yLabel: 'Acres',
      sourceLabel: 'NIFC',
      sourceMethod: 'official',
      rows,
    });
    expect(parsed?.rows).toHaveLength(50);
  });
});
