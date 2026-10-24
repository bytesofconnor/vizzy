import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPOSE_DISPOSITIONS } from './compose-outcome';
import { openApiSpec } from './openapi';
import { payBody, payMessage } from './pay';

const mocks = vi.hoisted(() => ({
  consumeSlot: vi.fn(),
  refundSlot: vi.fn(),
  pieceFromPrompt: vi.fn(),
}));

vi.mock('./billing', () => ({
  consumeSlot: mocks.consumeSlot,
  refundSlot: mocks.refundSlot,
  signedInNav: vi.fn(async () => ({})),
  walletTokenFromRequest: vi.fn(async () => undefined),
}));

vi.mock('./from-prompt', () => ({
  pieceFromPrompt: mocks.pieceFromPrompt,
  publicComposeError: (error: unknown) =>
    error instanceof Error && error.message ? error.message : 'Could not generate that chart',
}));

import { POST } from '../app/api/compose/route';

const bitcoin = 'Bitcoin price from March to June 2021';
const economy = 'Is the economy doing better?';

function post(body: unknown, accept: string) {
  return POST(
    new Request('https://vizzy.test/api/compose', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept,
      },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  mocks.consumeSlot.mockReset();
  mocks.refundSlot.mockReset();
  mocks.pieceFromPrompt.mockReset();
  mocks.consumeSlot.mockResolvedValue({ ok: true, via: 'open', freeLeft: 3, credits: 0 });
  mocks.pieceFromPrompt.mockResolvedValue({ ok: false, error: 'draft failed', issues: [] });
});

describe('POST /api/compose', () => {
  it('returns clarify JSON for eggs before the meter, including stream and html accepts', async () => {
    for (const accept of ['text/event-stream', 'text/html']) {
      mocks.consumeSlot.mockClear();
      mocks.pieceFromPrompt.mockClear();
      const first = await post({ prompt: 'eggs' }, accept);
      const second = await post({ prompt: 'eggs' }, accept);
      for (const response of [first, second]) {
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type') ?? '').toContain('application/json');
        const body = (await response.json()) as {
          clarify?: { options?: unknown[] };
          ok?: unknown;
          url?: unknown;
          png?: unknown;
          token?: unknown;
          error?: unknown;
        };
        expect(body.clarify?.options?.length).toBeGreaterThanOrEqual(1);
        expect(body.clarify?.options?.length).toBeLessThanOrEqual(3);
        expect(body.ok).toBeUndefined();
        expect(body.url).toBeUndefined();
        expect(body.png).toBeUndefined();
        expect(body.token).toBeUndefined();
        expect(body.error).toBeUndefined();
      }
      expect(mocks.consumeSlot).not.toHaveBeenCalled();
      expect(mocks.pieceFromPrompt).not.toHaveBeenCalled();
    }
  });

  it('returns the economy clarify object and no error', async () => {
    const response = await post({ prompt: economy }, 'application/json');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      clarify: {
        question: 'Which measure should the chart use?',
        options: [
          { label: 'GDP', prompt: `${economy} GDP` },
          { label: 'Unemployment', prompt: `${economy} unemployment` },
          { label: 'Prices', prompt: `${economy} prices` },
        ],
      },
    });
    expect(mocks.consumeSlot).not.toHaveBeenCalled();
  });

  it('spends one slot for bitcoin and returns the mint failure', async () => {
    const failure = { ok: false, error: 'Could not draft that chart', issues: [] };
    mocks.pieceFromPrompt.mockResolvedValue(failure);
    const response = await post({ prompt: bitcoin }, 'application/json');
    expect(mocks.consumeSlot).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(failure);
  });

  it('mints eggs when disposition is send', async () => {
    const response = await post({ prompt: 'eggs', disposition: 'send' }, 'application/json');
    expect(response.status).toBe(400);
    expect(mocks.consumeSlot).toHaveBeenCalledTimes(1);
    expect(mocks.pieceFromPrompt).toHaveBeenCalledTimes(1);
    expect(mocks.pieceFromPrompt.mock.calls[0]?.[0]).toMatchObject({ kind: 'mint', prompt: 'eggs' });
  });

  it('spends a slot for an option prompt', async () => {
    await post({ prompt: 'eggs price' }, 'application/json');
    expect(mocks.consumeSlot).toHaveBeenCalledTimes(1);
    expect(mocks.pieceFromPrompt.mock.calls[0]?.[0]).toMatchObject({ kind: 'mint', prompt: 'eggs price' });
  });

  it('does not meter eggs when the slot would be refused, and returns 402 for bitcoin', async () => {
    mocks.consumeSlot.mockResolvedValue({ ok: false, via: 'pay', freeLeft: 0, credits: 0 });
    const eggs = await post({ prompt: 'eggs' }, 'application/json');
    expect(eggs.status).toBe(200);
    expect(mocks.consumeSlot).not.toHaveBeenCalled();
    const paid = await post({ prompt: bitcoin }, 'application/json');
    expect(mocks.consumeSlot).toHaveBeenCalledTimes(1);
    expect(paid.status).toBe(402);
    expect(await paid.json()).toEqual(payBody(payMessage()));
    expect(mocks.pieceFromPrompt).not.toHaveBeenCalled();
  });
});

describe('openapi compose request', () => {
  it('uses the same disposition enum as COMPOSE_DISPOSITIONS', () => {
    const spec = openApiSpec('https://vizzy.run');
    const disposition =
      spec.paths['/api/compose'].post.requestBody.content['application/json'].schema.properties.disposition;
    expect(disposition.enum).toEqual(COMPOSE_DISPOSITIONS);
  });
});
