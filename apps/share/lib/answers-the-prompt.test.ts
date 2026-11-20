import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolvePrompt } from '@vizzy/resolve';
import { compositionRows } from './composition';
import { decideCompose } from './compose-decision';
import { mintDraft } from './from-prompt';
import { mintFromOfficial } from './official-mint';

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../eval/fixtures/answers-the-prompt.json'), 'utf8')
) as { id: string; prompts: Array<{ id: string; text: string }> };

const G7 = ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'];
const SOURCES: Array<[string, number]> = [
  ['Natural gas', 43.1],
  ['Nuclear', 18.6],
  ['Coal', 16.2],
  ['Wind', 10.2],
  ['Hydro', 5.7],
  ['Solar', 3.9],
  ['Biomass', 1.1],
  ['Petroleum', 0.4],
];

function prompt(id: string): string {
  const found = fixture.prompts.find((item) => item.id === id);
  if (!found) {
    throw new Error(`missing prompt ${id}`);
  }
  return found.text;
}

function bank(rows: Array<{ country: string; date: string; value: number }>): string {
  return JSON.stringify([
    {},
    rows.map((row) => ({ country: { value: row.country }, date: row.date, value: row.value })),
  ]);
}

describe('answers the prompt', () => {
  it('covers the seven audited prompts', () => {
    expect(fixture.id).toBe('answers-the-prompt');
    expect(fixture.prompts).toHaveLength(7);
  });

  it('draws every G7 country over time as a line', async () => {
    const asked = prompt('g7-gdp-since-1990');
    const rows = G7.flatMap((country, index) => [
      { country, date: '1990', value: 20000 + index * 1000 },
      { country, date: '2005', value: 32000 + index * 1000 },
      { country, date: '2020', value: 45000 + index * 1000 },
    ]);
    const series = await resolvePrompt(asked, {
      get: async () => bank(rows),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series).not.toBeNull();
    if (!series) {
      return;
    }
    const minted = mintFromOfficial(asked, series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.config.chart.type).toBe('line');
    const names = [...new Set(minted.piece.data.map((row) => String(row.series ?? '')))].filter(Boolean).sort();
    expect(names).toEqual([...G7].sort());
    const years = new Set(minted.piece.data.map((row) => String(row.x)));
    expect(years.size).toBeGreaterThan(1);
    expect(minted.piece.title.toLowerCase()).not.toMatch(/country ranking/);
    expect(minted.piece.config.axes?.x.label).toBe('Year');
  });

  it('keeps every major electricity source so the shares add up', () => {
    const asked = prompt('us-electricity-by-source');
    const notes = [
      '| Source | Share % |',
      '| --- | --- |',
      ...SOURCES.map(([name, value]) => `| ${name} | ${value} |`),
    ].join('\n');
    const composed = compositionRows(
      asked,
      notes,
      SOURCES.slice(-3).map(([name, value]) => ({ x: name, y: value }))
    );
    expect(composed.map((row) => row.x)).toEqual(SOURCES.map(([name]) => name));
    const minted = mintDraft(
      asked,
      { notes, urls: ['https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php'] },
      {
        title: asked,
        kicker: 'EIA',
        note: 'EIA electricity generation shares.',
        chartType: 'bar',
        area: false,
        xLabel: 'Source',
        yLabel: 'Share %',
        sourceLabel: 'EIA',
        sourceMethod: 'scraped',
        evidence: 'EIA electricity explained, generation by source.',
        rows: SOURCES.slice(-3).map(([name, value]) => ({ x: `${name} (${value}%)`, y: value })),
      }
    );
    expect(minted.ok, minted.ok ? '' : minted.error).toBe(true);
    if (!minted.ok) {
      return;
    }
    const names = minted.piece.data.map((row) => String(row.x));
    expect(names.length).toBeGreaterThanOrEqual(7);
    for (const [name] of SOURCES.slice(0, 5)) {
      expect(names).toContain(name);
    }
    const total = minted.piece.data.reduce((sum, row) => sum + Number(row.y), 0);
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it('does not publish the national median price under a ratio title', () => {
    const asked = prompt('home-price-to-income');
    const minted = mintDraft(
      asked,
      { notes: '', urls: ['https://fred.stlouisfed.org/series/MSPUS'] },
      {
        title: 'Home price-to-income ratio by metro',
        kicker: 'Housing',
        note: 'Median sales price of houses sold in the United States.',
        chartType: 'line',
        area: false,
        xLabel: 'Quarter',
        yLabel: 'Median sales price ($)',
        sourceLabel: 'FRED — median sales price of houses sold',
        sourceMethod: 'official',
        evidence: 'FRED series MSPUS, national median sales price.',
        rows: [
          { x: '2024-01', y: 412000 },
          { x: '2024-04', y: 418000 },
          { x: '2024-07', y: 426000 },
        ],
      }
    );
    if (minted.ok) {
      const claimsRatio = /ratio|price-to-income/i.test(`${minted.piece.title} ${minted.piece.note}`);
      const priceLevel = minted.piece.data.some((row) => typeof row.y === 'number' && row.y >= 1000);
      expect(claimsRatio && priceLevel).toBe(false);
    } else {
      expect(minted.ok).toBe(false);
    }
  });

  it('draws life expectancy versus GDP as a scatter, or refuses', async () => {
    const asked = prompt('life-expectancy-vs-gdp');
    const countries = ['Japan', 'United States', 'Nigeria', 'France'];
    const life = bank(countries.map((country, index) => ({ country, date: '2023', value: 84 - index * 8 })));
    const gdp = bank(countries.map((country, index) => ({ country, date: '2023', value: 48000 - index * 10000 })));
    const series = await resolvePrompt(asked, {
      get: async (url) => (url.includes('SP.DYN.LE00.IN') ? life : gdp),
      now: Date.UTC(2026, 10, 20),
    });
    if (!series) {
      expect(series).toBeNull();
      return;
    }
    const minted = mintFromOfficial(asked, series);
    if (!minted.ok) {
      expect(minted.error.toLowerCase()).toMatch(/unit|ratio|shown/);
      return;
    }
    expect(minted.piece.config.chart.type).toBe('scatter');
    const labels = `${minted.piece.config.axes?.x.label} ${minted.piece.config.axes?.y.label}`.toLowerCase();
    expect(labels).toMatch(/year/);
    expect(labels).toMatch(/usd|per person|\$/);
    expect(labels).not.toMatch(/\bpercent\b/);
    expect(minted.piece.config.source?.label ?? '').not.toMatch(/^FRED/);
  });

  it('asks on a vague inflation prompt and sends US CPI', async () => {
    const asked = prompt('inflation');
    const decision = decideCompose({ prompt: asked, disposition: undefined });
    expect(decision.kind).toBe('clarify');
    const sent = decideCompose({ prompt: asked, disposition: 'send' });
    expect(sent).toMatchObject({ kind: 'mint', prompt: 'US CPI inflation' });
    const lines = ['observation_date,CPIAUCSL'];
    for (let month = 1; month <= 36; month += 1) {
      const year = 2023 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      lines.push(`${year}-${String(m).padStart(2, '0')}-01,${280 + month}`);
    }
    const series = await resolvePrompt('US CPI inflation', {
      get: async () => lines.join('\n'),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.yLabel.toLowerCase()).toMatch(/inflation|%/);
    expect(series?.rows.every((row) => row.y < 30)).toBe(true);
    expect(series?.rows.some((row) => /venezuela/i.test(String(row.x)))).toBe(false);
  });

  it('shows federal debt and the 10-year yield, or names the gap', async () => {
    const asked = prompt('debt-and-yield');
    const series = await resolvePrompt(asked, {
      get: async (url) => {
        const id = url.includes('GFDEBTN') ? 'GFDEBTN' : 'DGS10';
        const value = id === 'GFDEBTN' ? 20000000 : 3;
        return ['observation_date,' + id, `2019-01-01,${value}`, `2019-04-01,${value + 1}`, `2019-07-01,${value + 2}`, `2019-10-01,${value + 3}`].join('\n');
      },
      now: Date.UTC(2026, 10, 20),
    });
    expect(series).not.toBeNull();
    if (!series) {
      return;
    }
    const minted = mintFromOfficial(asked, series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const blob = `${minted.piece.title} ${minted.piece.config.axes?.x.label} ${minted.piece.config.axes?.y.label} ${minted.piece.config.source?.label ?? ''}`.toLowerCase();
    const debt = blob.includes('debt');
    const yieldShown = blob.includes('yield');
    expect(debt || yieldShown).toBe(true);
    if (!(debt && yieldShown)) {
      expect(blob).toMatch(/not shown/);
    }
  });

  it('plots renewable electricity share for Germany, France, and Spain', async () => {
    const asked = prompt('renewables-three-countries');
    const series = await resolvePrompt(asked, {
      get: async () =>
        bank([
          { country: 'Germany', date: '2022', value: 43.2 },
          { country: 'France', date: '2022', value: 24.1 },
          { country: 'Spain', date: '2022', value: 47.5 },
          { country: 'Norway', date: '2022', value: 98.4 },
        ]),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series).not.toBeNull();
    if (!series) {
      return;
    }
    const minted = mintFromOfficial(asked, series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data.map((row) => String(row.x)).sort()).toEqual(['France', 'Germany', 'Spain']);
  });
});
