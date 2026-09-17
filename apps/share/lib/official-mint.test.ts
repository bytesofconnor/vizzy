import { describe, expect, it } from 'vitest';
import { mintFromOfficial, yearlyOfficialRows } from './official-mint';
import type { ResolvedSeries } from '@vizzy/resolve';

const co2: ResolvedSeries = {
  family: 'noaa',
  seriesId: 'co2_annmean_mlo',
  sourceLabel: 'NOAA GML — Mauna Loa CO₂ annual mean',
  sourceUrl: 'https://gml.noaa.gov/ccgg/trends/data.html',
  method: 'official',
  retrieved: Date.UTC(2026, 0, 1),
  xLabel: 'Year',
  yLabel: 'CO₂ ppm',
  rows: [
    { x: '2020', y: 414 },
    { x: '2021', y: 416 },
    { x: '2022', y: 418 },
    { x: '2023', y: 421 },
  ],
};

describe('mintFromOfficial', () => {
  it('draws a line for yearly official rows without a model', () => {
    expect(yearlyOfficialRows(co2.rows)).toBe(true);
    const minted = mintFromOfficial('Atmospheric CO₂ at Mauna Loa by decade', co2);
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.config.chart.type).toBe('line');
      expect(minted.piece.data.length).toBe(4);
      expect(minted.piece.config.source?.method).toBe('official');
    }
  });

  it('does not use the remix scaffold as a title', () => {
    const minted = mintFromOfficial(
      'Start from this chart and ask a sharper public question. Keep published numbers. Do not invent a source.\n\nThe next cut I want:',
      co2
    );
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.title).toBe('CO₂ ppm by Year');
    }
  });
});
