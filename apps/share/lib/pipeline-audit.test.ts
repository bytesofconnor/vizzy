import { describe, expect, it } from 'vitest';
import { resolvePrompt, type ResolvedSeries } from '@vizzy/resolve';
import { mintFromOfficial } from './official-mint';

const NOW = Date.UTC(2026, 10, 20);

function monthlyCsv(id: string, start: string, end: string, valueAt: (year: number, month: number) => number): string {
  const lines = [`observation_date,${id}`];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    lines.push(`${year}-${String(month).padStart(2, '0')}-01,${valueAt(year, month)}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return lines.join('\n');
}

function cpiLevel(year: number, month: number): number {
  const months = (year - 2014) * 12 + (month - 1);
  const smooth = 100 * 1.02 ** (months / 12);
  if (year === 2022 && month === 6) {
    const base = 100 * 1.02 ** (((2021 - 2014) * 12 + 5) / 12);
    return Math.round(base * 1.091 * 1000) / 1000;
  }
  return Math.round(smooth * 1000) / 1000;
}

function repeatsRange(title: string): boolean {
  const spans = title.match(/\b(?:1[89]|20)\d{2}\s*(?:-|–|—|to|through)\s*(?:1[89]|20)\d{2}\b/gi) ?? [];
  const since = /\b(?:since|from)\s+(?:1[89]|20)\d{2}\b/i.test(title);
  const months = title.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:1[89]|20)\d{2}\b/gi
  );
  return spans.length > 1 || (since && spans.length > 0) || ((months?.length ?? 0) >= 2 && spans.length > 0);
}

function subtitleOf(piece: { title: string; note: string }): string {
  const extra = piece as { subtitle?: string };
  return extra.subtitle ?? '';
}

async function mintedPrompt(prompt: string, csvFor: (url: string) => string) {
  const series = await resolvePrompt(prompt, {
    get: async (url) => csvFor(url),
    now: NOW,
  });
  expect(series, prompt).not.toBeNull();
  const minted = mintFromOfficial(prompt, series!);
  expect(minted.ok, minted.ok ? prompt : minted.error).toBe(true);
  if (!minted.ok) {
    throw new Error(minted.error);
  }
  return { series: series!, piece: minted.piece };
}

describe('pipeline audit 2026-11-20', () => {
  it('keeps the 2020 unemployment peak and draws a line', async () => {
    const { piece } = await mintedPrompt('US unemployment since 2000', (url) => {
      if (!url.includes('UNRATE')) {
        return '';
      }
      return monthlyCsv('UNRATE', '1948-01', '2026-10', (year, month) => (year === 2020 && month === 4 ? 14.8 : 4));
    });
    const values = piece.data.map((row) => Number(row.y));
    expect(Math.max(...values)).toBeGreaterThanOrEqual(14.7);
    expect(piece.config.chart.type).toBe('line');
    expect(repeatsRange(piece.title)).toBe(false);
    expect(piece.note.trim()).not.toBe('FRED — U.S. unemployment rate');
    expect(`${subtitleOf(piece)} ${piece.note}`).toMatch(/2000/);
    expect(`${subtitleOf(piece)} ${piece.note}`).toMatch(/2026/);
  });

  it('charts CPI inflation since 2015 as a year-over-year percent', async () => {
    const { series, piece } = await mintedPrompt('US CPI inflation since 2015', (url) => {
      if (!url.includes('CPIAUCSL')) {
        return '';
      }
      return monthlyCsv('CPIAUCSL', '2014-01', '2026-10', cpiLevel);
    });
    expect(series.yLabel).toMatch(/yo[y%]|%/i);
    const values = piece.data.map((row) => Number(row.y));
    const peak = Math.max(...values);
    expect(peak).toBeGreaterThan(8.5);
    expect(peak).toBeLessThan(10);
    const at = piece.data.find((row) => Number(row.y) === peak);
    expect(String(at?.x)).toMatch(/^2022-/);
    expect(piece.config.chart.type).toBe('line');
    expect(repeatsRange(piece.title)).toBe(false);
  });

  it('limits the 30-year mortgage rate to January 2020 through December 2023', async () => {
    const { piece } = await mintedPrompt('30-year mortgage rate from January 2020 to December 2023', (url) => {
      if (!url.includes('MORTGAGE30US')) {
        return '';
      }
      return monthlyCsv('MORTGAGE30US', '1971-04', '2026-11', (year, month) => {
        if (year === 2023 && month === 10) {
          return 7.79;
        }
        if (year === 2024 && month === 6) {
          return 9.1;
        }
        return 4;
      });
    });
    const stamps = piece.data.map((row) => String(row.x));
    expect(stamps.every((stamp) => stamp >= '2020-01' && stamp <= '2023-12')).toBe(true);
    expect(stamps.some((stamp) => stamp < '2020-01' || stamp > '2023-12')).toBe(false);
    const peak = Math.max(...piece.data.map((row) => Number(row.y)));
    expect(peak).toBeGreaterThan(7.5);
    expect(peak).toBeLessThan(8.1);
    expect(piece.config.chart.type).toBe('line');
    expect(repeatsRange(piece.title)).toBe(false);
  });

  it('draws months that start before 2000 as a line', () => {
    const rows = Array.from({ length: 24 }, (_, index) => {
      const month = (index % 12) + 1;
      const year = 1990 + Math.floor(index / 12);
      return { x: `${year}-${String(month).padStart(2, '0')}`, y: 5 + index / 10 };
    });
    const series: ResolvedSeries = {
      family: 'fred',
      seriesId: 'UNRATE',
      sourceLabel: 'FRED — U.S. unemployment rate',
      sourceUrl: 'https://fred.stlouisfed.org/series/UNRATE',
      method: 'official',
      retrieved: NOW,
      xLabel: 'Month',
      yLabel: 'Unemployment %',
      rows,
    };
    const minted = mintFromOfficial('US unemployment since 1990', series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.config.chart.type).toBe('line');
    expect(repeatsRange(minted.piece.title)).toBe(false);
  });

  it('says when Japan population since 1960 stops in 1983', () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({ x: String(1960 + index), y: 90_000_000 + index * 1_000_000 }));
    const series: ResolvedSeries = {
      family: 'owid',
      seriesId: 'japan_population',
      sourceLabel: 'Official population series',
      sourceUrl: 'https://example.com/japan-population',
      method: 'official',
      retrieved: NOW,
      xLabel: 'Year',
      yLabel: 'People',
      rows,
    };
    const minted = mintFromOfficial('Japan population since 1960', series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const chrome = `${minted.piece.title}\n${subtitleOf(minted.piece)}\n${minted.piece.note}`;
    expect(chrome).toMatch(/1983/);
    expect(chrome).toMatch(/short of 2026/);
    expect(minted.piece.note.trim()).not.toBe(series.sourceLabel);
    expect(repeatsRange(minted.piece.title)).toBe(false);
    expect(subtitleOf(minted.piece)).toMatch(/People/);
    expect(subtitleOf(minted.piece)).toMatch(/1960-1983/);
  });

  it('capitalizes USD on an official price series', () => {
    const rows = [
      { x: '2024-01', y: 42000 },
      { x: '2024-02', y: 51000 },
      { x: '2024-03', y: 67000 },
      { x: '2024-04', y: 64000 },
    ];
    const series: ResolvedSeries = {
      family: 'fred',
      seriesId: 'CBBTCUSD',
      sourceLabel: 'FRED — Coinbase Bitcoin price (USD)',
      sourceUrl: 'https://fred.stlouisfed.org/series/CBBTCUSD',
      method: 'official',
      retrieved: NOW,
      xLabel: 'Month',
      yLabel: 'Price (usd)',
      rows,
    };
    const minted = mintFromOfficial('Bitcoin price in 2024', series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.config.axes.y.label).toBe('Price (USD)');
    expect(subtitleOf(minted.piece)).toMatch(/\bUSD\b/);
    expect(subtitleOf(minted.piece)).not.toMatch(/\busd\b/);
    expect(minted.piece.note.trim()).not.toBe(series.sourceLabel);
    const stamps = minted.piece.data.map((row) => String(row.x));
    expect(stamps.every((stamp) => stamp.startsWith('2024'))).toBe(true);
  });
});
