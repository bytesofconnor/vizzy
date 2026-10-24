import { describe, expect, it } from 'vitest';
import { mintDraft } from './from-prompt';

type DraftRow = { x: string; y: number; series?: string };

function draft(title: string, rows: DraftRow[], yLabel = 'Value') {
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

function gathered(notes: string) {
  return { notes, urls: ['https://example.com/series'] };
}

function seriesNames(data: Array<Record<string, unknown>>): string[] {
  return [...new Set(data.map((row) => String(row.series ?? '')).filter(Boolean))];
}

describe('named series on the minted chart', () => {
  it('keeps Germany, France, and Spain when the notes have each country', () => {
    const notes = [
      '| Year | Germany | France | Spain |',
      '| --- | --- | --- | --- |',
      '| 2019 | 40 | 20 | 18 |',
      '| 2020 | 44 | 22 | 21 |',
      '| 2021 | 41 | 23 | 22 |',
      '| 2022 | 46 | 24 | 23 |',
    ].join('\n');
    const result = mintDraft(
      'Renewable electricity in Germany, France, and Spain',
      gathered(notes),
      draft(
        'Renewables in Germany, France, and Spain',
        [
          { x: '2019', y: 40 },
          { x: '2020', y: 44 },
          { x: '2021', y: 41 },
          { x: '2022', y: 46 },
        ],
        'Share %'
      )
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(seriesNames(result.piece.data).sort()).toEqual(['France', 'Germany', 'Spain']);
    expect(result.piece.config.dataMapping.color).toBe('series');
    expect(result.piece.config.legend.show).toBe(true);
  });

  it('says the renewables chart is mostly Germany when France and Spain are missing', () => {
    const notes = [
      'Germany renewable share',
      '| Year | Share |',
      '| --- | --- |',
      '| 2019 | 40 |',
      '| 2020 | 44 |',
      '| 2021 | 41 |',
      '| 2022 | 46 |',
    ].join('\n');
    const result = mintDraft(
      'Renewable electricity in Germany, France, and Spain',
      gathered(notes),
      draft('Renewables in Germany, France, and Spain', [
        { x: '2019', y: 40 },
        { x: '2020', y: 44 },
        { x: '2021', y: 41 },
        { x: '2022', y: 46 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const drawn = seriesNames(result.piece.data);
    const showsAll = ['Germany', 'France', 'Spain'].every((name) => drawn.includes(name));
    expect(showsAll || /mostly Germany/i.test(result.piece.title)).toBe(true);
  });

  it('draws Netflix and Disney+ as two series', () => {
    const notes = [
      '| Year | Netflix | Disney+ |',
      '| --- | --- | --- |',
      '| 2020 | 200 | 70 |',
      '| 2021 | 220 | 110 |',
      '| 2022 | 230 | 150 |',
      '| 2023 | 260 | 150 |',
    ].join('\n');
    const result = mintDraft(
      'Netflix versus Disney+ subscribers',
      gathered(notes),
      draft('Netflix versus Disney+', [
        { x: '2022', y: 230 },
        { x: '2023', y: 260 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const drawn = seriesNames(result.piece.data);
    const twoSeries = drawn.includes('Netflix') && drawn.includes('Disney+');
    const titled =
      /Netflix/i.test(result.piece.title) &&
      /Disney\+/i.test(result.piece.title) &&
      /2020/.test(result.piece.title) &&
      /2023/.test(result.piece.title);
    expect(twoSeries || titled).toBe(true);
    if (twoSeries) {
      expect(result.piece.config.dataMapping.color).toBe('series');
      expect(result.piece.config.legend.show).toBe(true);
    }
  });

  it('names the Netflix series and the years actually drawn when Disney+ is missing', () => {
    const notes = [
      '| Year | Netflix |',
      '| --- | --- |',
      '| 2018 | 140 |',
      '| 2019 | 160 |',
      '| 2020 | 200 |',
      '| 2021 | 220 |',
    ].join('\n');
    const result = mintDraft(
      'Netflix versus Disney+ subscribers',
      gathered(notes),
      draft('Netflix versus Disney+', [
        { x: '2020', y: 200 },
        { x: '2021', y: 220 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const drawn = seriesNames(result.piece.data);
    const twoSeries = drawn.includes('Netflix') && drawn.includes('Disney+');
    expect(twoSeries || (/Netflix/.test(result.piece.title) && /2018/.test(result.piece.title) && /2021/.test(result.piece.title))).toBe(
      true
    );
  });

  it('says Austin 2025 when Denver and Miami are missing', () => {
    const notes = [
      'Austin',
      '| Month | Rent |',
      '| --- | --- |',
      '| Jan 2025 | 1650 |',
      '| Feb 2025 | 1660 |',
      '| Mar 2025 | 1675 |',
      '| Apr 2025 | 1680 |',
    ].join('\n');
    const result = mintDraft(
      'Austin, Denver, and Miami rent',
      gathered(notes),
      draft('Austin, Denver, and Miami rent', [
        { x: 'Jan 2025', y: 1650 },
        { x: 'Feb 2025', y: 1660 },
        { x: 'Mar 2025', y: 1675 },
        { x: 'Apr 2025', y: 1680 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const drawn = new Set(
      result.piece.data.flatMap((row) => [String(row.series ?? ''), String(row.x ?? '')])
    );
    const showsAll = ['Austin', 'Denver', 'Miami'].every((name) => drawn.has(name));
    expect(showsAll || result.piece.title.includes('Austin 2025')).toBe(true);
  });

  it('keeps Austin, Denver, and Miami when each city is in the notes', () => {
    const notes = [
      '| Year | Austin | Denver | Miami |',
      '| --- | --- | --- | --- |',
      '| 2023 | 1500 | 1600 | 1800 |',
      '| 2024 | 1550 | 1620 | 1850 |',
      '| 2025 | 1650 | 1700 | 1900 |',
      '| 2026 | 1700 | 1720 | 1920 |',
    ].join('\n');
    const result = mintDraft(
      'Austin, Denver, and Miami rent',
      gathered(notes),
      draft('Austin, Denver, and Miami rent', [
        { x: '2025', y: 1650 },
        { x: '2026', y: 1700 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(seriesNames(result.piece.data).sort()).toEqual(['Austin', 'Denver', 'Miami']);
  });

  it('draws nuclear, coal, and gas as separate series', () => {
    const notes = [
      '| Year | nuclear | coal | gas |',
      '| --- | --- | --- | --- |',
      '| 2019 | 800 | 900 | 1500 |',
      '| 2020 | 790 | 770 | 1600 |',
      '| 2021 | 780 | 800 | 1580 |',
      '| 2022 | 770 | 820 | 1620 |',
    ].join('\n');
    const result = mintDraft(
      'US electricity from nuclear, coal, and gas',
      gathered(notes),
      draft('US nuclear, coal, and gas', [
        { x: '2019', y: 800 },
        { x: '2020', y: 790 },
        { x: '2021', y: 780 },
        { x: '2022', y: 770 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(seriesNames(result.piece.data).sort()).toEqual(['coal', 'gas', 'nuclear']);
  });

  it('names the one fuel when the notes only have coal', () => {
    const notes = [
      '| Year | coal |',
      '| --- | --- |',
      '| 2019 | 900 |',
      '| 2020 | 770 |',
      '| 2021 | 800 |',
      '| 2022 | 820 |',
    ].join('\n');
    const result = mintDraft(
      'US electricity from nuclear, coal, and gas',
      gathered(notes),
      draft('US nuclear, coal, and gas', [
        { x: '2019', y: 900 },
        { x: '2020', y: 770 },
        { x: '2021', y: 800 },
        { x: '2022', y: 820 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const drawn = seriesNames(result.piece.data);
    const showsAll = ['nuclear', 'coal', 'gas'].every((name) => drawn.includes(name));
    expect(showsAll || /coal/i.test(result.piece.title)).toBe(true);
    if (!showsAll) {
      expect(result.piece.title).not.toMatch(/nuclear/i);
      expect(result.piece.title).not.toMatch(/\bgas\b/i);
    }
  });

  it('leaves a single-series prompt title alone', () => {
    const notes = [
      '| Year | Rate |',
      '| --- | --- |',
      '| 2019 | 3.7 |',
      '| 2020 | 8.1 |',
      '| 2021 | 5.4 |',
      '| 2022 | 3.6 |',
    ].join('\n');
    const result = mintDraft(
      'US unemployment rate since 2019',
      gathered(notes),
      draft('US unemployment rate since 2019', [
        { x: '2019', y: 3.7 },
        { x: '2020', y: 8.1 },
        { x: '2021', y: 5.4 },
        { x: '2022', y: 3.6 },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.piece.title).toBe('US unemployment rate since 2019');
    expect(result.piece.config.dataMapping.color).toBeUndefined();
  });
});
