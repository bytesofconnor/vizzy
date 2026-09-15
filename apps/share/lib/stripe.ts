import Stripe from 'stripe';
import { PACK_CENTS, PACK_CREDITS } from './pack';

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  return new Stripe(key);
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
        name: `${PACK_CREDITS} Vizzy charts`,
        description: 'Prompt a chart. Paste the image.',
      },
    },
  };
}
