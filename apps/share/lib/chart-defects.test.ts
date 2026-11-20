/**
 * @vitest-environment jsdom
 */
import { renderToSVG } from '@vizzy/core';
import { resolvePrompt } from '@vizzy/resolve';
import { describe, expect, it } from 'vitest';
import { mintFromOfficial } from './official-mint';

const G7 = ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'];

const END_GDP: Record<string, number> = {
  Canada: 56000,
  France: 49000,
  Germany: 56100,
  Italy: 43000,
  Japan: 34000,
  'United Kingdom': 56050,
  'United States': 90000,
};

function g7Bank(): string {
  const rows = G7.flatMap((country) =>
    Array.from({ length: 36 }, (_, offset) => {
      const year = 1990 + offset;
      return {
        country: { value: country },
        date: String(year),
        value: (END_GDP[country] ?? 40000) - (2025 - year) * 500,
      };
    })
  );
  return JSON.stringify([{}, rows]);
}

function eurostatRen(): string {
  const geos = [
    { code: 'DE', name: 'Germany' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
  ];
  const years = ['2005', '2014', '2023'];
  const value: Record<string, number> = {};
  geos.forEach((geo, geoIndex) => {
    years.forEach((year, yearIndex) => {
      value[String(geoIndex * years.length + yearIndex)] = 8 + geoIndex + yearIndex * 6;
    });
  });
  return JSON.stringify({
    id: ['freq', 'nrg_bal', 'unit', 'geo', 'time'],
    size: [1, 1, 1, geos.length, years.length],
    value,
    dimension: {
      freq: { category: { index: { A: 0 }, label: { A: 'Annual' } } },
      nrg_bal: { category: { index: { REN: 0 }, label: { REN: 'Renewables' } } },
      unit: { category: { index: { PC: 0 }, label: { PC: 'Percentage' } } },
      geo: {
        category: {
          index: Object.fromEntries(geos.map((geo, index) => [geo.code, index])),
          label: Object.fromEntries(geos.map((geo) => [geo.code, geo.name])),
        },
      },
      time: {
        category: {
          index: Object.fromEntries(years.map((year, index) => [year, index])),
          label: Object.fromEntries(years.map((year) => [year, year])),
        },
      },
    },
  });
}

function eiaCsv(): string {
  const header = 'MSN,YYYYMM,Value,Column_Order,Description,Unit';
  const full: Record<string, number> = {
    ELETPUS: 1000,
    NGETPUS: 400,
    CLETPUS: 160,
    NUETPUS: 180,
    WYETPUS: 100,
    HVETPUS: 60,
    SOETPUS: 50,
  };
  const lines = [header];
  for (const year of ['2024', '2025']) {
    for (const [msn, value] of Object.entries(full)) {
      lines.push(`${msn},${year}13,${value},1,${msn},Million Kilowatthours`);
    }
  }
  return lines.join('\n');
}

function lin(channel: number): number {
  const unit = channel / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function lab(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const red = lin(Number.parseInt(raw.slice(0, 2), 16));
  const green = lin(Number.parseInt(raw.slice(2, 4), 16));
  const blue = lin(Number.parseInt(raw.slice(4, 6), 16));
  const x = red * 0.4124 + green * 0.3576 + blue * 0.1805;
  const y = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const z = red * 0.0193 + green * 0.1192 + blue * 0.9505;
  const cube = (channel: number) => (channel > 0.008856 ? channel ** (1 / 3) : 7.787 * channel + 16 / 116);
  const fx = cube(x / 0.95047);
  const fy = cube(y / 1);
  const fz = cube(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function cie76(left: string, right: string): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const MIN_LINE_HUE_DISTANCE = 30;

describe('production chart defects', () => {
  it('plots every G7 year from 1990 to 2025 with distinct hues and separated end labels', async () => {
    const asked = 'G7 GDP per capita since 1990';
    const series = await resolvePrompt(asked, {
      get: async () => g7Bank(),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series).not.toBeNull();
    const minted = mintFromOfficial(asked, series!);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    for (const country of G7) {
      const years = minted.piece.data
        .filter((row) => row.series === country)
        .map((row) => Number(row.x))
        .sort((left, right) => left - right);
      expect(years).toEqual(Array.from({ length: 36 }, (_, offset) => 1990 + offset));
    }
    const svg = await renderToSVG(minted.piece.config, minted.piece.data);
    const host = document.createElement('div');
    host.innerHTML = svg;
    const paths = [...host.querySelectorAll('path.line')];
    expect(paths).toHaveLength(G7.length);
    for (const path of paths) {
      expect(path.getAttribute('d')?.match(/M/g)).toHaveLength(1);
    }
    const strokes = paths.map((path) => path.getAttribute('stroke') ?? '');
    expect(new Set(strokes).size).toBe(G7.length);
    for (let left = 0; left < strokes.length; left += 1) {
      for (let right = left + 1; right < strokes.length; right += 1) {
        expect(cie76(strokes[left]!, strokes[right]!)).toBeGreaterThan(MIN_LINE_HUE_DISTANCE);
      }
    }
    const labels = [...host.querySelectorAll('.series-end-label')].map((node) =>
      Number(node.getAttribute('y'))
    );
    expect(labels).toHaveLength(G7.length);
    const ordered = [...labels].sort((left, right) => left - right);
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index]! - ordered[index - 1]!).toBeGreaterThanOrEqual(14);
    }
  });

  it('plots a Eurostat since-prompt as lines in ascending time and names a snapshot year', async () => {
    const ranged = 'renewables share Germany France Spain since 2005';
    const panel = await resolvePrompt(ranged, {
      get: async () => eurostatRen(),
      now: Date.UTC(2026, 10, 20),
    });
    const panelMint = mintFromOfficial(ranged, panel!);
    expect(panelMint.ok).toBe(true);
    if (!panelMint.ok) {
      return;
    }
    expect(panelMint.piece.config.chart.type).toBe('line');
    const germany = panelMint.piece.data
      .filter((row) => row.series === 'Germany')
      .map((row) => String(row.x));
    expect(germany.length).toBeGreaterThan(1);
    expect(germany).toEqual([...germany].sort());
    const svg = await renderToSVG(panelMint.piece.config, panelMint.piece.data);
    const host = document.createElement('div');
    host.innerHTML = svg;
    const ticks = [...host.querySelectorAll('.x-axis .tick text')]
      .map((node) => ({
        year: Number(node.textContent),
        x: Number(node.parentElement?.getAttribute('transform')?.match(/translate\(([-0-9.]+)/)?.[1] ?? 0),
      }))
      .filter((tick) => Number.isFinite(tick.year))
      .sort((left, right) => left.x - right.x);
    expect(ticks.length).toBeGreaterThan(1);
    for (let index = 1; index < ticks.length; index += 1) {
      expect(ticks[index]!.year).toBeGreaterThan(ticks[index - 1]!.year);
    }

    const snapshotAsk = 'Renewables share in Germany, France, Spain';
    const snapshot = await resolvePrompt(snapshotAsk, {
      get: async () => eurostatRen(),
      now: Date.UTC(2026, 10, 20),
    });
    const snapshotMint = mintFromOfficial(snapshotAsk, snapshot!);
    expect(snapshotMint.ok).toBe(true);
    if (!snapshotMint.ok) {
      return;
    }
    expect(snapshotMint.piece.config.chart.type).toBe('bar');
    expect(`${snapshotMint.piece.title} ${snapshotMint.piece.note}`).toMatch(/\b2023\b/);
  });

  it('does not title an EIA chart with a year the table does not have', async () => {
    const asked = 'US electricity generation by source in 2019';
    const series = await resolvePrompt(asked, {
      get: async () => eiaCsv(),
      now: Date.UTC(2026, 10, 20),
    });
    const minted = mintFromOfficial(asked, series!);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.title).not.toMatch(/\b2019\b/);
    expect(`${minted.piece.title} ${minted.piece.note}`).toMatch(/2019 is not in the EIA table/);
    expect(minted.piece.title).toMatch(/\b2025\b/);
  });
});
