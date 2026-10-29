import { describe, expect, it } from 'vitest';
import { mintDraft } from './from-prompt';

describe('date note', () => {
  it('names the first and last plotted year when the draft says a later end', () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({ x: String(2000 + index), y: 100 + index }));
    const minted = mintDraft(
      'US GDP since 2000',
      { notes: '', urls: [] },
      {
        title: 'US GDP since 2000',
        kicker: 'Economy',
        note: 'US GDP, 2000–2025',
        chartType: 'line',
        area: false,
        xLabel: 'Year',
        yLabel: 'Billion $',
        sourceLabel: 'BEA',
        sourceMethod: 'estimate',
        evidence: 'Lookup failed, so the rows are a sketch of the published series.',
        rows,
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data.at(-1)?.x).toBe('2023');
    expect(minted.piece.note).toMatch(/2000-2023/);
    expect(minted.piece.note).not.toMatch(/2025/);
  });
});
