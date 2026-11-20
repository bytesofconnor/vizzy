import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
