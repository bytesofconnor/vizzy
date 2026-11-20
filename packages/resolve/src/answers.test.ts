import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COUNTRY_GROUPS } from './groups';
import { placesInAsked } from './places';
import { matchPrompt, resolvePrompt } from './index';
import { matchAsked } from './catalog';

const G7 = ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'];

function bank(rows: Array<{ country: string; date: string; value: number }>): string {
  return JSON.stringify([
    {},
    rows.map((row) => ({ country: { value: row.country }, date: row.date, value: row.value })),
  ]);
}

function fred(id: string, rows: Array<[string, number]>): string {
  return [`observation_date,${id}`, ...rows.map(([date, value]) => `${date},${value}`)].join('\n');
}

function eurostatRen(): string {
  const geos = [
    { code: 'DE', name: 'Germany' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
  ];
  const years = ['2005', '2023'];
  const values = [7.2, 21.5, 8.5, 25, 9.1, 22];
  const value: Record<string, number> = {};
  values.forEach((item, index) => {
    value[String(index)] = item;
  });
  return JSON.stringify({
    id: ['freq', 'nrg_bal', 'unit', 'geo', 'time'],
    size: [1, 2, 1, geos.length, years.length],
    value,
    dimension: {
      freq: { category: { index: { A: 0 }, label: { A: 'Annual' } } },
      nrg_bal: {
        category: {
          index: { REN: 0, REN_ELC: 1 },
          label: { REN: 'Renewable energy - overall', REN_ELC: 'Renewable energy - electricity' },
        },
      },
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

const EIA_T07 = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'parse/fixtures/eia-t07.02a.csv'),
  'utf8'
);

function eiaGeneration(gasByYear: Array<[string, number]> = []): string {
  const header = 'MSN,YYYYMM,Value,Column_Order,Description,Unit';
  const full: Record<string, number> = {
    ELETPUS: 1000,
    NGETPUS: 400,
    CLETPUS: 160,
    NUETPUS: 180,
    WYETPUS: 100,
    HVETPUS: 60,
    SOETPUS: 50,
    PAETPUS: 20,
    WDETPUS: 15,
    WSETPUS: 10,
    GEETPUS: 5,
    OJETPUS: 5,
    HPETPUS: -5,
  };
  const gas = new Map<string, number>([['2026', 10], ...gasByYear]);
  const years = [...new Set(['2024', '2025', '2026', ...gasByYear.map(([year]) => year)])].sort();
  const lines = [header];
  for (const year of years) {
    const gasValue = gas.get(year) ?? full.NGETPUS;
    const wind = year === '2026' ? 1 : full.WYETPUS;
    for (const [msn, value] of Object.entries(full)) {
      const shown = msn === 'NGETPUS' ? gasValue : msn === 'WYETPUS' ? wind : value;
      lines.push(`${msn},${year}13,${shown},1,${msn},Million Kilowatthours`);
    }
  }
  return lines.join('\n');
}

describe('country groups', () => {
  it('names the G7, G20, EU, and OECD', () => {
    expect(COUNTRY_GROUPS.G7).toEqual(G7);
    expect(COUNTRY_GROUPS.G20).toHaveLength(19);
    expect(COUNTRY_GROUPS.EU).toHaveLength(27);
    expect(COUNTRY_GROUPS.OECD).toHaveLength(38);
    expect(placesInAsked('G7 GDP per capita since 1990')).toEqual(G7);
    expect(placesInAsked('OECD inflation')).toHaveLength(38);
  });
});

describe('answers the prompt', () => {
  it('draws G7 GDP per capita since 1990 as a seven-country time series', async () => {
    const rows = G7.flatMap((country, index) => [
      { country, date: '1990', value: 20000 + index * 1000 },
      { country, date: '2005', value: 30000 + index * 1000 },
      { country, date: '2020', value: 40000 + index * 1000 },
    ]);
    rows.push({ country: 'China', date: '2020', value: 10000 });
    rows.push({ country: 'World', date: '2020', value: 11000 });
    const series = await resolvePrompt('G7 GDP per capita since 1990', {
      get: async () => bank(rows),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.seriesId).toBe('NY.GDP.PCAP.CD');
    expect(series?.xLabel).toBe('Year');
    expect(series?.yLabel.toLowerCase()).toMatch(/usd|per person/);
    const names = [...new Set((series?.rows ?? []).map((row) => row.series))].sort();
    expect(names).toEqual([...G7].sort());
    expect(series?.rows.some((row) => row.x === '1990')).toBe(true);
    expect(series?.rows.some((row) => row.series === 'China')).toBe(false);
  });

  it('draws life expectancy against GDP as a scatter with each series unit', async () => {
    const countries = ['Japan', 'United States', 'Nigeria', 'France', 'India'];
    const life = bank(countries.map((country, index) => ({ country, date: '2023', value: 80 - index * 5 })));
    const gdp = bank(countries.map((country, index) => ({ country, date: '2023', value: 50000 - index * 9000 })));
    const series = await resolvePrompt('Life expectancy vs GDP per capita', {
      get: async (url) => (url.includes('SP.DYN.LE00.IN') ? life : gdp),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.chartType).toBe('scatter');
    expect(series?.xLabel.toLowerCase()).toMatch(/usd|per person/);
    expect(series?.yLabel.toLowerCase()).toMatch(/year/);
    expect(series?.sourceLabel.toLowerCase()).toContain('world bank');
    expect(series?.sourceLabel).not.toMatch(/^FRED/);
    expect(series?.yLabel).not.toBe('Percent');
    expect((series?.rows.length ?? 0) >= 2).toBe(true);
  });

  it('keeps at least 150 countries and drops aggregates on a life-expectancy scatter', async () => {
    const countries = Array.from({ length: 160 }, (_item, index) => `Country ${index}`);
    const extras = ['Africa Eastern and Southern', 'High income', 'World'];
    const all = [...countries, ...extras];
    const life = bank(all.map((country, index) => ({ country, date: '2023', value: 50 + (index % 30) })));
    const gdp = bank(all.map((country, index) => ({ country, date: '2023', value: 800 + index * 400 })));
    const series = await resolvePrompt('Life expectancy vs GDP per capita', {
      get: async (url) => (url.includes('SP.DYN.LE00.IN') ? life : gdp),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.chartType).toBe('scatter');
    expect(series?.xLabel.toLowerCase()).toMatch(/usd|per person/);
    expect(series?.yLabel.toLowerCase()).toMatch(/year/);
    const names = (series?.rows ?? []).map((row) => String(row.series));
    expect(names.length).toBeGreaterThanOrEqual(150);
    expect(names.some((name) => /africa eastern|high income|^world$/i.test(name))).toBe(false);
  });

  it('keeps federal debt and the 10-year yield on labeled axes', async () => {
    const series = await resolvePrompt('Federal debt and 10-year yield', {
      get: async (url) => {
        if (url.includes('GFDEBTN')) {
          return fred('GFDEBTN', [
            ['2018-01-01', 21000000],
            ['2018-04-01', 21200000],
            ['2018-07-01', 21400000],
            ['2018-10-01', 21600000],
          ]);
        }
        return fred('DGS10', [
          ['2018-01-15', 2.5],
          ['2018-04-15', 2.8],
          ['2018-07-15', 2.9],
          ['2018-10-15', 3.1],
        ]);
      },
      now: Date.UTC(2026, 10, 20),
    });
    expect(series).not.toBeNull();
    const blob = `${series?.xLabel} ${series?.yLabel} ${series?.sourceLabel} ${series?.missingSeries ?? ''}`.toLowerCase();
    expect(blob).toMatch(/debt/);
    expect(blob).toMatch(/yield/);
    expect(series?.chartType === 'scatter' || Boolean(series?.missingSeries)).toBe(true);
    if (series?.chartType === 'scatter') {
      expect(series.yLabel).not.toBe(series.xLabel);
    }
  });

  it('plots renewable share for Germany, France, and Spain', async () => {
    expect(matchPrompt('Renewables share in Germany, France, Spain')?.seriesId).toBe('nrg_ind_ren');
    expect(matchPrompt('renewables share Germany France Spain since 2005')?.seriesId).toBe('nrg_ind_ren');
    expect(matchPrompt('renewable share of energy consumption in Germany, France, and Spain')?.seriesId).toBe(
      'EG.FEC.RNEW.ZS'
    );
    expect(matchPrompt('renewables share in Nigeria and Kenya')?.seriesId).toBe('EG.FEC.RNEW.ZS');
    const series = await resolvePrompt('Renewables share in Germany, France, Spain', {
      get: async (url) => {
        expect(url).toContain('ec.europa.eu/eurostat');
        expect(url).not.toContain('pispace');
        return eurostatRen();
      },
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.seriesId).toBe('nrg_ind_ren');
    expect(series?.sourceLabel.toLowerCase()).toContain('eurostat');
    expect(series?.rows.map((row) => row.x).sort()).toEqual(['France', 'Germany', 'Spain']);
    expect(series?.sourceLabel).toMatch(/\b2023\b/);
    const panel = await resolvePrompt('renewables share Germany France Spain since 2005', {
      get: async () => eurostatRen(),
      now: Date.UTC(2026, 10, 20),
    });
    expect(panel?.seriesId).toBe('nrg_ind_ren');
    expect(panel?.rows.some((row) => row.series === 'Germany' && row.x === '2005')).toBe(true);
    expect(panel?.rows.some((row) => row.series === 'Spain' && row.x === '2023')).toBe(true);
    expect(panel?.rows.some((row) => /total|overall/i.test(String(row.series ?? row.x)))).toBe(false);
  });

  it('reads US electricity generation by source from the EIA', async () => {
    const asked = 'US electricity generation by source';
    expect(matchPrompt(asked)?.seriesId).toBe('us_net_generation_by_source');
    expect(matchPrompt(asked)?.family).toBe('eia');
    const series = await resolvePrompt(asked, {
      get: async (url) => {
        expect(url).toContain('eia.gov');
        expect(url).toContain('T07.02A');
        return eiaGeneration();
      },
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.family).toBe('eia');
    expect(series?.sourceLabel).toMatch(/EIA/);
    expect(series?.sourceLabel).toMatch(/2025/);
    expect(series?.sourceUrl).toContain('eia.gov');
    const names = series?.rows.map((row) => String(row.x)) ?? [];
    expect(names).toEqual([
      'Natural gas',
      'Nuclear',
      'Coal',
      'Wind',
      'Hydro',
      'Petroleum and other',
      'Solar',
    ]);
    expect(names.join(' ').toLowerCase()).not.toMatch(/\btotal\b|\boverall\b|\brenewables\b/);
    const sum = series?.rows.reduce((total, row) => total + row.y, 0) ?? 0;
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
    expect(series?.rows[0]?.y).toBeGreaterThanOrEqual(series?.rows[1]?.y ?? 0);
  });

  it('returns 2023 rows when the prompt asks for 2023', async () => {
    const asked = 'US electricity generation by source in 2023';
    const series = await resolvePrompt(asked, {
      get: async () => eiaGeneration([
        ['2023', 250],
        ['2024', 400],
        ['2025', 400],
      ]),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.sourceLabel).toMatch(/\b2023\b/);
    expect(series?.sourceLabel).not.toMatch(/\b2025\b/);
    expect(series?.rows.find((row) => row.x === 'Natural gas')?.y).toBe(25);
  });

  it('reads 2023 annual rows from the published T07.02A table', async () => {
    const asked = 'US electricity generation by source in 2023';
    const series = await resolvePrompt(asked, {
      get: async () => EIA_T07,
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.snapshotYear).toBe('2023');
    expect(series?.sourceLabel).toMatch(/\b2023\b/);
    expect(series?.sourceLabel).not.toMatch(/\b2025\b/);
    expect(series?.rows.find((row) => row.x === 'Natural gas')?.y).toBe(43.2);
    const latest = await resolvePrompt('US electricity generation by source', {
      get: async () => EIA_T07,
      now: Date.UTC(2026, 10, 20),
    });
    expect(latest?.snapshotYear).toBe('2025');
    expect(latest?.rows.find((row) => row.x === 'Natural gas')?.y).toBe(40.8);
  });

  it('does not label a missing EIA year as if that year were plotted', async () => {
    const series = await resolvePrompt('US electricity generation by source in 2019', {
      get: async () => eiaGeneration(),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.sourceLabel).toMatch(/\b2025\b/);
    expect(series?.sourceLabel).not.toMatch(/\b2019\b/);
  });

  it('defaults a bare inflation prompt to US CPI, not a country ranking', async () => {
    expect(matchAsked('inflation').map((row) => row.seriesId)).toEqual(['CPIAUCSL']);
    const lines = ['observation_date,CPIAUCSL'];
    for (let month = 1; month <= 24; month += 1) {
      const year = 2024 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      lines.push(`${year}-${String(m).padStart(2, '0')}-01,${300 + month}`);
    }
    const series = await resolvePrompt('inflation', {
      get: async () => lines.join('\n'),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.seriesId).toBe('CPIAUCSL');
    expect(series?.yLabel.toLowerCase()).toMatch(/inflation|%/);
    expect(series?.rows.every((row) => row.y < 30)).toBe(true);
    expect(series?.rows.some((row) => /venezuela/i.test(String(row.x)))).toBe(false);
  });

  it('does not draw US CPI for UK inflation since 1800', async () => {
    const series = await resolvePrompt('UK inflation since 1800', {
      get: async () => fred('CPIAUCSL', [
        ['1950-01-01', 24],
        ['1951-01-01', 26],
        ['2000-01-01', 172],
        ['2020-01-01', 258],
        ['2024-01-01', 308],
      ]),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.seriesId ?? null).not.toBe('CPIAUCSL');
    expect(series).toBeNull();
  });

  it('reads Japan population since 1960 from the World Bank through 2020', async () => {
    expect(matchPrompt('Japan population since 1960')?.seriesId).toBe('SP.POP.TOTL');
    const series = await resolvePrompt('Japan population since 1960', {
      get: async (url) => {
        expect(url).toContain('SP.POP.TOTL');
        return bank([
          { country: 'Japan', date: '1960', value: 93216000 },
          { country: 'Japan', date: '1983', value: 119259000 },
          { country: 'Japan', date: '2020', value: 126261000 },
          { country: 'Japan', date: '2023', value: 124516000 },
          { country: 'China', date: '2023', value: 1410710000 },
        ]);
      },
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.sourceUrl).toContain('SP.POP.TOTL');
    const years = (series?.rows ?? []).map((row) => Number(row.x));
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2020);
    expect(series?.rows.every((row) => row.series === 'Japan' || row.x === 'Japan')).toBe(true);
  });
});
