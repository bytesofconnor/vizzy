import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => {
    throw new Error('cookies() outside a request scope');
  },
}));

import { WALLET_COOKIE } from './pack';
import { recordAfterChart } from './telemetry';

const saved: Array<{ path: string; walletToken?: string; slug?: string; title?: string }> = [];

afterEach(() => {
  saved.length = 0;
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_CONVEX_URL;
  delete process.env.COMPOSE_SERVER_SECRET;
});

describe('recordAfterChart', () => {
  it('writes each signed-in chart to the library when cookies() is outside the request', async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://convex.test';
    process.env.COMPOSE_SERVER_SECRET = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          path: string;
          args: { walletToken?: string; slug?: string; title?: string };
        };
        saved.push({
          path: body.path,
          walletToken: body.args.walletToken,
          slug: body.args.slug,
          title: body.args.title,
        });
        return new Response(JSON.stringify({ status: 'success', value: null }), { status: 200 });
      })
    );

    const request = new Request('https://vizzy.test/api/compose', {
      headers: { cookie: `${WALLET_COOKIE}=signed-in-wallet` },
    });
    for (let index = 0; index < 9; index += 1) {
      await recordAfterChart({
        request,
        slug: `chart-${index}`,
        title: `Chart ${index}`,
        route: 'compose',
      });
    }

    const charts = saved.filter((row) => row.path === 'charts:save');
    expect(charts).toHaveLength(9);
    expect(charts.map((row) => row.slug)).toEqual(
      Array.from({ length: 9 }, (_, index) => `chart-${index}`)
    );
    expect(charts.every((row) => row.walletToken === 'signed-in-wallet' && row.title?.startsWith('Chart '))).toBe(
      true
    );
  });
});
