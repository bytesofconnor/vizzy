import { afterEach, describe, expect, it, vi } from 'vitest';
import { mintFromOfficial } from './official-mint';
import { gatherOfficialSeries } from './series';

const G7 = ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'];

function bank(rows: Array<{ country: string; date: string; value: number }>): string {
  return JSON.stringify([
    {},
    rows.map((row) => ({ country: { value: row.country }, date: row.date, value: row.value })),
  ]);
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('official series cache', () => {
  const previousUrl = process.env.CONVEX_URL;
  const previousPublic = process.env.NEXT_PUBLIC_CONVEX_URL;
  const previousSecret = process.env.COMPOSE_SERVER_SECRET;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousUrl === undefined) {
      delete process.env.CONVEX_URL;
    } else {
      process.env.CONVEX_URL = previousUrl;
    }
    if (previousPublic === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
    } else {
      process.env.NEXT_PUBLIC_CONVEX_URL = previousPublic;
    }
    if (previousSecret === undefined) {
      delete process.env.COMPOSE_SERVER_SECRET;
    } else {
      process.env.COMPOSE_SERVER_SECRET = previousSecret;
    }
  });

  it('returns different rows for two prompts on one series with different countries', async () => {
    process.env.CONVEX_URL = 'https://cache.test';
    process.env.COMPOSE_SERVER_SECRET = 'test-secret';
    const store = new Map<string, unknown>();
    const payload = bank([
      ...G7.flatMap((country, index) => [
        { country, date: '1990', value: 20000 + index * 1000 },
        { country, date: '2005', value: 30000 + index * 1000 },
        { country, date: '2020', value: 40000 + index * 1000 },
      ]),
      { country: 'China', date: '2020', value: 10000 },
      { country: 'India', date: '2020', value: 2000 },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const target = String(url);
        if (target.includes('/api/query') || target.includes('/api/mutation')) {
          const body = JSON.parse(String(init?.body)) as { path?: string; args?: Record<string, unknown> };
          const args = body.args ?? {};
          const key =
            typeof args.cacheKey === 'string' ? args.cacheKey : `${String(args.family)}|${String(args.seriesId)}`;
          if (target.includes('/api/query')) {
            return json({ status: 'success', value: store.get(key) ?? null });
          }
          if (String(body.path).endsWith('putCached')) {
            store.set(key, {
              family: args.family,
              seriesId: args.seriesId,
              sourceLabel: args.sourceLabel,
              sourceUrl: args.sourceUrl,
              method: 'official',
              retrieved: args.retrieved,
              xLabel: args.xLabel,
              yLabel: args.yLabel,
              rows: args.rows,
              ...(typeof args.snapshotYear === 'string' ? { snapshotYear: args.snapshotYear } : {}),
              ...(typeof args.truncatedTo === 'number' ? { truncatedTo: args.truncatedTo } : {}),
            });
          }
          return json({ status: 'success', value: null });
        }
        if (target.includes('worldbank.org')) {
          return new Response(payload, { status: 200 });
        }
        return new Response('missing', { status: 404 });
      })
    );

    const first = await gatherOfficialSeries('GDP per capita in the United States, China, and India');
    const second = await gatherOfficialSeries('G7 GDP per capita since 1990');
    const names = (rows: Array<{ x: string; series?: string }> | undefined) =>
      [...new Set((rows ?? []).map((row) => row.series ?? row.x))].sort();
    expect(names(first?.series.rows)).toEqual(['China', 'India', 'United States']);
    expect(names(second?.series.rows)).toEqual([...G7].sort());
    expect((second?.series.rows.length ?? 0) > 7).toBe(true);
    expect(second?.series.rows.some((row) => row.series === 'China' || row.x === 'China')).toBe(false);
  });

  it('titles a cached Eurostat snapshot with its year', async () => {
    process.env.CONVEX_URL = 'https://cache.test';
    process.env.COMPOSE_SERVER_SECRET = 'test-secret';
    const store = new Map<string, Record<string, unknown>>();
    let reads = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const target = String(url);
        if (target.includes('/api/query') || target.includes('/api/mutation')) {
          const body = JSON.parse(String(init?.body)) as { path?: string; args?: Record<string, unknown> };
          const args = body.args ?? {};
          const key = typeof args.cacheKey === 'string' ? args.cacheKey : '';
          if (target.includes('/api/query')) {
            return json({ status: 'success', value: store.get(key) ?? null });
          }
          if (String(body.path).endsWith('putCached')) {
            store.set(key, {
              family: args.family,
              seriesId: args.seriesId,
              sourceLabel: args.sourceLabel,
              sourceUrl: args.sourceUrl,
              method: 'official',
              retrieved: args.retrieved,
              xLabel: args.xLabel,
              yLabel: args.yLabel,
              rows: args.rows,
              ...(typeof args.snapshotYear === 'string' ? { snapshotYear: args.snapshotYear } : {}),
              ...(typeof args.truncatedTo === 'number' ? { truncatedTo: args.truncatedTo } : {}),
            });
          }
          return json({ status: 'success', value: null });
        }
        if (target.includes('eurostat')) {
          reads += 1;
          return new Response(eurostatRen(), { status: 200 });
        }
        return new Response('missing', { status: 404 });
      })
    );

    const asked = 'Renewables share in Germany, France, Spain';
    const first = await gatherOfficialSeries(asked);
    expect(first?.series.snapshotYear).toBe('2023');
    expect(reads).toBe(1);
    for (const row of store.values()) {
      row.sourceLabel = 'Eurostat — renewable energy share';
    }
    const second = await gatherOfficialSeries(asked);
    expect(reads).toBe(1);
    expect(second?.series.snapshotYear).toBe('2023');
    expect(second?.series.sourceLabel).toMatch(/\b2023\b/);
    const minted = mintFromOfficial(asked, second!.series);
    expect(minted.ok).toBe(true);
    if (minted.ok) {
      expect(minted.piece.title).toMatch(/\b2023\b/);
    }
  });
});

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
