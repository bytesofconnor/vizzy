import { describe, expect, it } from 'vitest';
import type { ResolvedSeries } from '@vizzy/resolve';
import { mintDraft } from './from-prompt';
import { mintFromOfficial } from './official-mint';

const base: ResolvedSeries = {
  family: 'wiki',
  seriesId: 'wild_tigers',
  sourceLabel: 'Wikipedia — wild tiger population by country',
  sourceUrl: 'https://en.wikipedia.org/wiki/Tiger',
  method: 'official',
  retrieved: Date.UTC(2026, 9, 24),
  xLabel: 'Country',
  yLabel: 'Wild tigers',
  rows: [
    { x: 'India', y: 3167 },
    { x: 'Nepal', y: 355 },
  ],
};

describe('chart titles use resolved spellings', () => {
  it('spells the series words the chart resolved, not the typo in the prompt', () => {
    const minted = mintFromOfficial('Wild tigres by contry', base);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Wild tigers by country');
    expect(minted.piece.config.accessibility?.title).toBe(
      'Wild tigers by country'
    );
  });

  it('spells a category the rows resolved when the prompt missed a letter', () => {
    const minted = mintFromOfficial('San Mareno GDP per person', {
      ...base,
      family: 'worldbank',
      seriesId: 'NY.GDP.PCAP.CD',
      sourceLabel: 'World Bank — GDP per capita',
      sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
      xLabel: 'Country',
      yLabel: 'GDP per capita',
      rows: [
        { x: 'San Marino', y: 54000 },
        { x: 'India', y: 2400 },
      ],
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('San Marino GDP per person');
  });

  it('spells the drafted title from the row the chart drew', () => {
    const minted = mintDraft(
      'Burkino Faso literacy',
      { notes: 'Public lookup found no matching table.', urls: [] },
      {
        title: 'Burkino Faso literacy',
        kicker: 'Estimate',
        note: 'No published page backs these numbers.',
        chartType: 'bar',
        area: false,
        xLabel: 'Country',
        yLabel: 'Literacy %',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows: [
          { x: 'Burkina Faso', y: 34 },
          { x: 'Mali', y: 31 },
        ],
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Burkina Faso literacy');
    expect(minted.piece.data.map(row => row.x)).toEqual([
      'Burkina Faso',
      'Mali',
    ]);
  });

  it('spells an alias the series resolved when the axis label does not', () => {
    const minted = mintFromOfficial('Atmospherice CO2 at Mauna Loa', {
      ...base,
      family: 'noaa',
      seriesId: 'co2_annmean_mlo',
      sourceLabel: 'NOAA GML — Mauna Loa CO₂ annual mean',
      sourceUrl: 'https://gml.noaa.gov/ccgg/trends/data.html',
      xLabel: 'Year',
      yLabel: 'CO₂ ppm',
      rows: [
        { x: '2020', y: 414 },
        { x: '2023', y: 421 },
      ],
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Atmospheric CO2 at Mauna Loa');
  });

  it('leaves a plural stem alone', () => {
    const minted = mintFromOfficial('Wild tiger by country', base);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).toBe('Wild tiger by country');
  });

  it('does not rewrite a different pole into the resolved one', () => {
    const minted = mintFromOfficial('Arctic sea ice extent', {
      ...base,
      family: 'owid',
      seriesId: 'antarctic_sea_ice',
      sourceLabel: 'Our World in Data — Antarctic sea ice (NSIDC)',
      sourceUrl: 'https://ourworldindata.org/grapher/antarctica-sea-ice-extent',
      xLabel: 'Year',
      yLabel: 'February minimum (million km²)',
      rows: [
        { x: '1979', y: 3.1 },
        { x: '2023', y: 1.9 },
      ],
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title.toLowerCase()).not.toMatch(/\barctic\b/);
    expect(minted.piece.title.toLowerCase()).toMatch(/\bantarctic\b/);
  });
});
