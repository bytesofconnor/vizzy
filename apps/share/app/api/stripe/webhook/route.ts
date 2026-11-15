import { grantWriterPlan } from '../../../../lib/billing';
import { fulfillCheckoutSession } from '../../../../lib/fulfill';
import { stripeClient } from '../../../../lib/stripe';
import { track } from '../../../../lib/track';
import { writerPlanEnabled, writerUpgradeDecision } from '../../../../lib/writer-plan';

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
    const decision = writerUpgradeDecision({
      flagOn: writerPlanEnabled(),
      livemode: Boolean(event.livemode),
      session,
    });
    if (decision.kind === 'error') {
      return Response.json({ ok: false, error: 'Checkout session missing wallet' }, { status: 500 });
    }
    if (decision.kind === 'grant') {
      try {
        const granted = await grantWriterPlan({
          walletToken: decision.walletToken,
          stripeSessionId: decision.sessionId,
          stripeCustomerId: decision.stripeCustomerId,
          email: decision.email,
        });
        if (!granted.duplicate) {
          await track('paid');
        }
      } catch (error) {
        console.error('stripe writer grant failed', error);
        return Response.json({ ok: false, error: 'Could not start Writer' }, { status: 500 });
      }
    } else if (decision.kind === 'pack') {
      try {
        await fulfillCheckoutSession(session);
      } catch (error) {
        console.error('stripe fulfill failed', error);
        return Response.json({ ok: false, error: 'Could not credit charts' }, { status: 500 });
      }
    }
  }

  return Response.json({ ok: true });
}
