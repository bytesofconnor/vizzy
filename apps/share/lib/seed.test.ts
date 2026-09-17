import { describe, expect, it } from 'vitest';
import { PIECES } from './pieces';
import {
  followUpNeedsLookup,
  isUnsupportedVizOnlyRevision,
  parseChartSeed,
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
