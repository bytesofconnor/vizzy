import { expect, test } from '@playwright/test';
import Stripe from 'stripe';
import { billingReady, stripeReady } from './helpers';

test('quota answers', async ({ request }) => {
  const response = await request.get('/api/quota');
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { canCompose?: boolean; credits?: number };
  expect(typeof body.canCompose).toBe('boolean');
  expect(typeof body.credits).toBe('number');
});

test('convex is reachable', async ({ request }) => {
  test.skip(!billingReady(), 'Convex is not configured');
  const response = await request.get('/api/quota');
  const body = (await response.json()) as { configured?: boolean };
  expect(body.configured).toBe(true);
});

test('stripe price exists', async () => {
  test.skip(!stripeReady(), 'Stripe is not configured');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID as string);
  expect(price.active).toBe(true);
  expect(price.unit_amount).toBe(800);
});

test('checkout opens a stripe session', async ({ request }) => {
  test.skip(!stripeReady() || !billingReady(), 'Billing is not configured');
  const response = await request.post('/api/checkout');
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { ok?: boolean; url?: string; error?: string };
  expect(body.ok).toBe(true);
  expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
});
