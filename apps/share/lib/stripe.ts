import Stripe from 'stripe';
import { PACK_CENTS, PACK_CREDITS } from './pack';

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return null;
  }
  try {
    return new Stripe(key);
  } catch (error) {
    console.error('stripe client failed', error);
    return null;
  }
}

export function packLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  const price = process.env.STRIPE_PRICE_ID;
  if (price) {
    return { quantity: 1, price };
  }
  return {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: PACK_CENTS,
      product_data: {
        name: `${PACK_CREDITS} vizzy charts`,
        description: 'Prompt a chart. Paste the image.',
      },
    },
  };
}
