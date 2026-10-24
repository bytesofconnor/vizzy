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

  it('keeps a named country ranking as bars', () => {
    const rows = ['India', 'Nepal', 'Bangladesh', 'Bhutan'].map((x, index) => ({ x, y: 3000 - index * 100 }));
    const minted = mintFromOfficial('Wild tigers by country', {
      ...co2,
      rows,
      xLabel: 'Country',
      yLabel: 'Tigers',
    });
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.config.chart.type).toBe('bar');
    }
  });

  it('draws a line for a monthly official series such as fed funds since 2000', () => {
    const rows = Array.from({ length: 24 }, (_, index) => {
      const month = String((index % 12) + 1).padStart(2, '0');
      const year = 2000 + Math.floor(index / 12);
      return { x: `${year}-${month}`, y: 5 - index * 0.1 };
    });
    const minted = mintFromOfficial('Fed funds since 2000', { ...co2, rows, xLabel: 'Month', yLabel: 'Rate %' });
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.config.chart.type).toBe('line');
      expect(minted.piece.config.axes.x.label).toBe('Month');
      expect(String(minted.piece.data[0]?.x)).toBe('2000-01');
      expect(minted.piece.title).toBe('Fed funds since 2000');
    }
  });

  it('draws yearly changes when a monthly rate is asked for changes per year', () => {
    const rows = [
      { x: '2000-01', y: 5.5 },
      { x: '2000-12', y: 6.5 },
      { x: '2001-12', y: 1.75 },
      { x: '2002-12', y: 1.25 },
      { x: '2003-12', y: 1 },
    ];
    const minted = mintFromOfficial('Plot federal funds rate changes per year from 2000 to 2026', {
      ...co2,
      rows,
      xLabel: 'Month',
      yLabel: 'Rate %',
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data.map((row) => row.x)).toEqual(['2001', '2002', '2003']);
    expect(minted.piece.data.map((row) => row.y)).toEqual([-4.75, -0.5, -0.25]);
    expect(minted.piece.config.axes.x.label).toBe('Year');
    expect(minted.piece.config.axes.y.label).toBe('Change in Rate %');
    expect(minted.piece.title.toLowerCase()).not.toContain('month');
    expect(minted.piece.title).toBe('Change in Rate % by Year');
    expect(minted.piece.config.chart.type).toBe('line');
  });

  it('rolls a monthly rate up to one point per year when asked by year', () => {
    const rows = [
      { x: '2000-06', y: 5 },
      { x: '2000-12', y: 6 },
      { x: '2001-12', y: 2 },
    ];
    const minted = mintFromOfficial('Show the federal funds rate by year', {
      ...co2,
      rows,
      xLabel: 'Month',
      yLabel: 'Rate %',
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data).toEqual([
      { x: '2000', y: 6 },
      { x: '2001', y: 2 },
    ]);
    expect(minted.piece.title).toBe('Rate % by Year');
    expect(minted.piece.config.axes.y.label).toBe('Rate %');
  });

  it('does not title world population as extreme poverty', () => {
    const population: ResolvedSeries = {
      family: 'owid',
      seriesId: 'world_population',
      sourceLabel: 'Our World in Data — world population',
      sourceUrl: 'https://ourworldindata.org/grapher/population',
      method: 'official',
      retrieved: Date.UTC(2026, 9, 24),
      xLabel: 'Year',
      yLabel: 'People',
      rows: [
        { x: '-10000', y: 4501152 },
        { x: '2023', y: 8091000000 },
      ],
    };
    const minted = mintFromOfficial('Extreme poverty 1990-2023', population);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title.toLowerCase()).toContain('world population');
    expect(minted.piece.title.toLowerCase()).not.toContain('poverty');
    expect(minted.piece.note.toLowerCase()).toContain('world population');
    expect(minted.piece.config.axes.y.label).toBe('People');
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
