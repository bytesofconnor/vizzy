import { afterEach, describe, expect, it } from 'vitest';
import { POST } from '../app/api/checkout/writer/route';

function post(body: unknown) {
  return POST(
    new Request('https://vizzy.test/api/checkout/writer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

afterEach(() => {
  delete process.env.WRITER_PLAN;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WRITER_PRICE_MONTHLY;
  delete process.env.STRIPE_WRITER_PRICE_YEARLY;
});

describe('writer checkout', () => {
  it('is missing when the flag is off', async () => {
    delete process.env.WRITER_PLAN;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    const response = await post({ interval: 'month' });
    expect(response.status).toBe(404);
  });

  it('refuses a live Stripe key', async () => {
    process.env.WRITER_PLAN = '1';
    process.env.STRIPE_SECRET_KEY = 'sk_live_123';
    process.env.STRIPE_WRITER_PRICE_MONTHLY = 'price_monthly_test';
    const response = await post({ interval: 'month' });
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('not configured');
  });

  it('refuses to invent a price when the test price id is missing', async () => {
    process.env.WRITER_PLAN = '1';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_WRITER_PRICE_MONTHLY;
    const response = await post({ interval: 'month' });
    expect(response.status).toBe(503);
  });
});
