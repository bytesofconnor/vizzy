import { describe, expect, it } from 'vitest';
import { mintPiece } from './mint';
import { studioChart } from './theme';
import { withDrawnSpan } from './year-span';

describe('withDrawnSpan', () => {
  it('keeps a provisional year in the note without a broken join', () => {
    const rows = [];
    for (let year = 2025; year >= 2004; year -= 1) {
      rows.push({ x: year === 2025 ? '2025*' : String(year), y: year });
    }
    const note = withDrawnSpan('latest complete year is 2024.', rows);
    expect(note).not.toContain('.,');
    expect(note).toMatch(/2004-2025/);
    expect(note).toMatch(/2025\* is provisional/);
  });
});

describe('scale words in the note', () => {
  it('drops $ millions once the axis shows $T', () => {
    const data = [
      { year: '2018', debt: 21_000_000 },
      { year: '2024', debt: 36_000_000 },
    ];
    const minted = mintPiece({
      title: 'Federal debt',
      note: 'Federal debt ($ millions). Latest complete year is 2024.',
      data,
      config: {
        schemaVersion: 1,
        chart: { type: 'line' },
        dataMapping: { x: 'year', y: 'debt' },
        axes: {
          x: { label: 'Year' },
          y: { label: 'Federal debt ($ millions)' },
        },
      },
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.note.toLowerCase()).not.toContain('million');
    expect(minted.piece.note).not.toContain('.,');
  });
});

describe('studio line palette', () => {
  it('gives a multi-series line a distinct colour per series', () => {
    const config = studioChart({ type: 'line' }, { x: 'x', y: 'y', color: 'series' });
    expect(new Set(config.colors.palette).size).toBeGreaterThanOrEqual(7);
  });
});
