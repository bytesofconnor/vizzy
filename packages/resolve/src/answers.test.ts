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
    expect(matchPrompt('Renewables share in Germany, France, Spain')?.seriesId).toBe('EG.ELC.RNEW.ZS');
    const series = await resolvePrompt('Renewables share in Germany, France, Spain', {
      get: async () =>
        bank([
          { country: 'Germany', date: '2022', value: 43 },
          { country: 'France', date: '2022', value: 25 },
          { country: 'Spain', date: '2022', value: 48 },
          { country: 'Norway', date: '2022', value: 98 },
        ]),
      now: Date.UTC(2026, 10, 20),
    });
    expect(series?.rows.map((row) => row.x).sort()).toEqual(['France', 'Germany', 'Spain']);
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
});
