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

  it('does not use a revise command as a title', () => {
    const minted = mintFromOfficial(
      'Add the missing comparison that would change how Tanzania looks',
      co2
    );
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.title).toBe('CO₂ ppm by Year');
    }
  });

  it('keeps a by-country prompt that already names the ranking', () => {
    const gdp: ResolvedSeries = {
      ...co2,
      family: 'worldbank',
      seriesId: 'NY.GDP.PCAP.CD',
      sourceLabel: 'World Bank — GDP per capita',
      sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
      xLabel: 'Country',
      yLabel: 'GDP per capita',
      rows: [
        { x: 'United States', y: 80000 },
        { x: 'Germany', y: 52000 },
      ],
    };
    const asked = 'GDP per capita by country since 2000 — who pulled away, and who got stuck?';
    const minted = mintFromOfficial(asked, gdp);
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.title).toBe(
        'GDP per capita by country since 2000 — who pulled away, and who got stuck'
      );
      expect(minted.piece.title.toLowerCase()).not.toContain('country ranking');
    }
  });

  it('says country ranking when a since-year place series is a country snapshot', () => {
    const deforestation: ResolvedSeries = {
      ...co2,
      family: 'owid',
      seriesId: 'deforestation',
      sourceLabel: 'Our World in Data — annual deforestation',
      sourceUrl: 'https://ourworldindata.org/grapher/annual-deforestation',
      xLabel: 'Country',
      yLabel: 'Forest lost (ha)',
      rows: [
        { x: 'Brazil', y: 1700000 },
        { x: 'Indonesia', y: 800000 },
        { x: 'Democratic Republic of Congo', y: 500000 },
      ],
    };
    const minted = mintFromOfficial(
      'Brazil deforestation Amazon area lost per year since 2004',
      deforestation
    );
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.title.toLowerCase()).toContain('country ranking');
      expect(minted.piece.title.toLowerCase()).not.toContain('since 2004');
      expect(minted.piece.title.toLowerCase()).not.toContain('per year');
      expect(minted.piece.data.map((row) => row.x)).toEqual([
        'Brazil',
        'Indonesia',
        'Democratic Republic of Congo',
      ]);
    }
  });
});
