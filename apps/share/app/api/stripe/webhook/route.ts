import { fulfillCheckoutSession } from '../../../../lib/fulfill';
import { stripeClient } from '../../../../lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ ok: false, error: 'Webhook is not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ ok: false, error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error('stripe webhook signature failed', error);
    return Response.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await fulfillCheckoutSession(session);
    } catch (error) {
      console.error('stripe fulfill failed', error);
      return Response.json({ ok: false, error: 'Could not credit charts' }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
