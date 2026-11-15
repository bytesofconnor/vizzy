import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  plan: undefined as 'writer' | undefined,
  sessionId: undefined as string | undefined,
  fulfills: 0,
}));

vi.mock('./billing', () => ({
  grantWriterPlan: async (input: { walletToken: string; stripeSessionId: string }) => {
    const { applyWriterGrant } = await import('./writer-plan');
    const next = applyWriterGrant(
      { plan: state.plan, writerCheckoutSessionId: state.sessionId },
      input.stripeSessionId
    );
    state.plan = next.plan;
    state.sessionId = next.writerCheckoutSessionId;
    return {
      ok: true,
      duplicate: next.duplicate,
      plan: 'writer' as const,
      walletToken: input.walletToken,
    };
  },
}));

vi.mock('./fulfill', () => ({
  fulfillCheckoutSession: async () => {
    state.fulfills += 1;
    return { ok: true, credits: 25, walletToken: 'pack-wallet' };
  },
}));

vi.mock('./stripe', () => ({
  stripeClient: () => ({
    webhooks: {
      constructEvent: (payload: string) => JSON.parse(payload) as unknown,
    },
  }),
}));

import { POST } from '../app/api/stripe/webhook/route';

function post(event: Record<string, unknown>) {
  return POST(
    new Request('https://vizzy.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=test' },
      body: JSON.stringify(event),
    })
  );
}

function writerEvent(livemode: boolean, id = 'cs_test_writer') {
  return {
    id: `evt_${id}`,
    type: 'checkout.session.completed',
    livemode,
    data: {
      object: {
        id,
        mode: 'subscription',
        payment_status: 'paid',
        client_reference_id: 'wallet_writer',
        metadata: { plan: 'writer', walletToken: 'wallet_writer' },
        customer: 'cus_test',
        customer_details: { email: 'writer@example.com' },
      },
    },
  };
}

beforeEach(() => {
  state.plan = undefined;
  state.sessionId = undefined;
  state.fulfills = 0;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.WRITER_PLAN = '1';
});

describe('writer webhook', () => {
  it('upgrades the wallet from a test-mode checkout and ignores a repeat', async () => {
    const first = await post(writerEvent(false));
    expect(first.status).toBe(200);
    expect(state.plan).toBe('writer');
    expect(state.sessionId).toBe('cs_test_writer');
    expect(state.fulfills).toBe(0);

    const second = await post(writerEvent(false));
    expect(second.status).toBe(200);
    expect(state.plan).toBe('writer');
    expect(state.fulfills).toBe(0);
  });

  it('does not upgrade a live-mode Writer event', async () => {
    const response = await post(writerEvent(true, 'cs_live_writer'));
    expect(response.status).toBe(200);
    expect(state.plan).toBeUndefined();
    expect(state.fulfills).toBe(0);
  });

  it('does not upgrade when the flag is off', async () => {
    delete process.env.WRITER_PLAN;
    const response = await post(writerEvent(false, 'cs_flag_off'));
    expect(response.status).toBe(200);
    expect(state.plan).toBeUndefined();
    expect(state.fulfills).toBe(0);
  });

  it('still credits the live pack checkout', async () => {
    const response = await post({
      id: 'evt_pack',
      type: 'checkout.session.completed',
      livemode: true,
      data: {
        object: {
          id: 'cs_pack',
          mode: 'payment',
          payment_status: 'paid',
          client_reference_id: 'wallet_pack',
          metadata: { credits: '25', walletToken: 'wallet_pack' },
        },
      },
    });
    expect(response.status).toBe(200);
    expect(state.plan).toBeUndefined();
    expect(state.fulfills).toBe(1);
  });
});
