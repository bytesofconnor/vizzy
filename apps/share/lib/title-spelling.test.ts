import { describe, expect, it } from 'vitest';
import type { ResolvedSeries } from '@vizzy/resolve';
import { mintDraft } from './from-prompt';
import { mintFromOfficial } from './official-mint';

const ice: ResolvedSeries = {
  family: 'owid',
  seriesId: 'antarctic_sea_ice',
  sourceLabel: 'Our World in Data — Antarctic sea ice (NSIDC)',
  sourceUrl: 'https://ourworldindata.org/grapher/antarctic-sea-ice',
  method: 'official',
  retrieved: Date.UTC(2026, 9, 24),
  xLabel: 'Year',
  yLabel: 'September minimum (million km²)',
  rows: [
    { x: '1979', y: 7.2 },
    { x: '2023', y: 4.3 },
  ],
};

function draft(title: string, rows: Array<{ x: string; y: number; series?: string }>, yLabel: string) {
  return {
    title,
    kicker: 'Chart',
    note: 'Looked-up figures.',
    chartType: 'line' as const,
    area: false,
    xLabel: 'Year',
    yLabel,
    sourceLabel: 'Public table',
    sourceMethod: 'scraped' as const,
    evidence: 'Rows copied from the looked-up table',
    rows,
  };
}

describe('resolved spelling in the title', () => {
  it('spells the series the chart resolved when the prompt mistyped it', () => {
    const minted = mintFromOfficial('Antartic sea ice extent 1979-2023', ice);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Antarctic sea ice extent 1979-2023');
    expect(minted.piece.note).toContain('Antarctic sea ice');
    expect(minted.piece.config.axes.y.label).toBe('September minimum (million km²)');
    expect(minted.piece.data.map((row) => row.x)).toEqual(['1979', '2023']);
  });

  it('spells resolved places in the title and leaves the axis and the note alone', () => {
    const sourceLabel = 'Wikipedia — wild tigers';
    const minted = mintFromOfficial('Wild tigres in Burkino Faso and San Mareno', {
      ...ice,
      seriesId: 'wild_tigers',
      sourceLabel,
      sourceUrl: 'https://en.wikipedia.org/wiki/Tiger',
      xLabel: 'Country',
      yLabel: 'Tigers',
      rows: [
        { x: 'Burkina Faso', y: 3 },
        { x: 'San Marino', y: 1 },
      ],
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Wild Tigers in Burkina Faso and San Marino');
    expect(minted.piece.note).toBe(sourceLabel);
    expect(minted.piece.config.axes.x.label).toBe('Country');
    expect(minted.piece.config.axes.y.label).toBe('Tigers');
    expect(minted.piece.data.map((row) => row.x)).toEqual(['Burkina Faso', 'San Marino']);
  });

  it('spells series names the draft resolved and does not retitle a correct prompt', () => {
    const rows = [
      { x: '2000', y: 1.1, series: 'Germany' },
      { x: '2020', y: 1.4, series: 'Germany' },
      { x: '2000', y: 2.2, series: 'France' },
      { x: '2020', y: 2.5, series: 'France' },
    ];
    const notes = 'GDP growth';
    const mistyped = mintDraft(
      'Germny and Frnace GDP growth since 2000',
      { notes, urls: ['https://example.com/gdp'] },
      draft('Germny and Frnace GDP growth since 2000', rows, 'GDP growth %')
    );
    expect(mistyped.ok).toBe(true);
    if (!mistyped.ok) {
      return;
    }
    expect(mistyped.piece.title).toBe('Germany and France GDP growth since 2000');
    expect(mistyped.piece.note).toBe('Looked-up figures.');
    expect(mistyped.piece.config.axes.y.label).toBe('GDP growth %');
    expect(mistyped.piece.data.map((row) => row.series)).toEqual(['Germany', 'Germany', 'France', 'France']);

    const clean = mintDraft(
      'Germany and France GDP growth since 2000',
      { notes, urls: ['https://example.com/gdp'] },
      draft('Germany and France GDP growth since 2000', rows, 'GDP growth %')
    );
    expect(clean.ok).toBe(true);
    if (!clean.ok) {
      return;
    }
    expect(clean.piece.title).toBe('Germany and France GDP growth since 2000');
  });

  it('does not rename a different pole when the typo is not that series', () => {
    const arctic: ResolvedSeries = {
      ...ice,
      seriesId: 'arctic_sea_ice',
      sourceLabel: 'Our World in Data — Arctic sea ice (NSIDC)',
      sourceUrl: 'https://ourworldindata.org/grapher/arctic-sea-ice',
      yLabel: 'September minimum (million km²)',
    };
    const minted = mintFromOfficial('Antartic sea ice extent 1979-2023', arctic);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title.toLowerCase()).toContain('antartic');
    expect(minted.piece.title.toLowerCase()).not.toMatch(/\barctic\b/);
  });
});
