import { afterEach, describe, expect, it, vi } from 'vitest';
import { WALLET_COOKIE } from './pack';

vi.mock('next/headers', () => ({
  cookies: async () => {
    throw new Error('cookies() outside a request scope');
  },
}));

const mocks = vi.hoisted(() => ({
  pieceFromPrompt: vi.fn(),
  cookieAlive: { current: true },
}));

vi.mock('./billing', async () => {
  const actual = await vi.importActual<typeof import('./billing')>('./billing');
  return {
    ...actual,
    consumeSlot: vi.fn(async () => ({ ok: true, via: 'owner', freeLeft: 3, credits: 0 })),
    refundSlot: vi.fn(async () => undefined),
  };
});

vi.mock('./compose-decision', () => ({
  decideCompose: () => ({ kind: 'mint', prompt: 'Bitcoin price from March to June 2021' }),
}));

vi.mock('./from-prompt', () => ({
  pieceFromPrompt: mocks.pieceFromPrompt,
  publicComposeError: (error: unknown) =>
    error instanceof Error && error.message ? error.message : 'Could not generate that chart',
}));

import { POST } from '../app/api/compose/route';

const saved: Array<{ walletToken?: string; slug?: string; title?: string; route?: string }> = [];

function fadingRequest(body: unknown): Request {
  const request = new Request('https://vizzy.test/api/compose', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      cookie: `${WALLET_COOKIE}=signed-in-wallet`,
    },
    body: JSON.stringify(body),
  });
  return new Proxy(request, {
    get(target, prop, receiver) {
      if (prop === 'headers') {
        return new Proxy(target.headers, {
          get(headers, headerProp) {
            if (headerProp === 'get') {
              return (name: string) => {
                if (!mocks.cookieAlive.current && name.toLowerCase() === 'cookie') {
                  return null;
                }
                return headers.get(name);
              };
            }
            const value = Reflect.get(headers, headerProp, headers);
            return typeof value === 'function' ? value.bind(headers) : value;
          },
        });
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Request;
}

afterEach(() => {
  saved.length = 0;
  mocks.cookieAlive.current = true;
  mocks.pieceFromPrompt.mockReset();
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_CONVEX_URL;
  delete process.env.COMPOSE_SERVER_SECRET;
});

describe('POST /api/compose library', () => {
  it('saves a signed-in chart after the compose stream drops the wallet cookie', async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://convex.test';
    process.env.COMPOSE_SERVER_SECRET = 'secret';
    mocks.pieceFromPrompt.mockImplementation(async () => {
      mocks.cookieAlive.current = false;
      return {
        ok: true,
        token: 'mint-token',
        piece: {
          slug: 'local',
          kicker: 'Session',
          title: 'Signed-in chart',
          note: 'A chart from this account.',
          config: {
            schemaVersion: 1,
            chart: { type: 'bar' },
            dataMapping: { x: 'month', y: 'revenue' },
          },
          data: [
            { month: 'Jan', revenue: 1 },
            { month: 'Feb', revenue: 2 },
          ],
        },
      };
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          path: string;
          args: { walletToken?: string; slug?: string; title?: string; route?: string };
        };
        if (body.path === 'charts:save') {
          saved.push(body.args);
        }
        const value = body.path === 'pastes:put' ? 'ok' : null;
        return new Response(JSON.stringify({ status: 'success', value }), { status: 200 });
      })
    );

    const response = await POST(
      fadingRequest({ prompt: 'Bitcoin price from March to June 2021' })
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.walletToken).toBe('signed-in-wallet');
    expect(saved[0]?.title).toBe('Signed-in chart');
    expect(saved[0]?.route).toBe('compose');
    expect(saved[0]?.slug && text.includes(`/c/${saved[0].slug}`)).toBe(true);
  });
});
