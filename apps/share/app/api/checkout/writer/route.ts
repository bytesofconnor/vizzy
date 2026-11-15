import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  billingConfigured,
  ensureWallet,
  getWalletByToken,
  newWalletToken,
  readWalletToken,
  walletCookieOptions,
} from '../../../../lib/billing';
import { track } from '../../../../lib/track';
import { writerPlanEnabled, writerPriceId, writerSecretIsTest, parseWriterInterval } from '../../../../lib/writer-plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!writerPlanEnabled()) {
    return new Response(null, { status: 404 });
  }

  const submitted = await readSubmission(request);
  const origin = new URL(request.url).origin;
  const interval = parseWriterInterval(submitted.interval);
  if (!interval) {
    return fail(submitted.form, origin, 400, 'Choose monthly or yearly.');
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const price = writerPriceId(interval);
  if (!writerSecretIsTest(secretKey) || !price) {
    return fail(submitted.form, origin, 503, 'Writer checkout is not configured.');
  }
  if (!billingConfigured()) {
    return fail(submitted.form, origin, 503, 'Writer checkout is not configured.');
  }

  const { stripeClient } = await import('../../../../lib/stripe');
  const stripe = stripeClient();
  if (!stripe) {
    return fail(submitted.form, origin, 503, 'Writer checkout is not configured.');
  }

  const existing = await readWalletToken();
  const token = existing ?? newWalletToken();
  await ensureWallet(token);
  const wallet = await getWalletByToken(token);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ quantity: 1, price }],
    success_url: `${origin}/pricing?writer=1`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: token,
    metadata: {
      walletToken: token,
      plan: 'writer',
      interval,
    },
    allow_promotion_codes: true,
  };
  if (wallet?.stripeCustomerId) {
    params.customer = wallet.stripeCustomerId;
  } else if (wallet?.email) {
    params.customer_email = wallet.email;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    console.error('writer checkout failed', error);
    if (params.customer) {
      delete params.customer;
      if (wallet?.email) {
        params.customer_email = wallet.email;
      }
      try {
        session = await stripe.checkout.sessions.create(params);
      } catch (retryError) {
        console.error('writer checkout retry failed', retryError);
        return fail(submitted.form, origin, 502, 'Could not start checkout.');
      }
    } else {
      return fail(submitted.form, origin, 502, 'Could not start checkout.');
    }
  }

  if (!session.url) {
    return fail(submitted.form, origin, 502, 'Could not start checkout.');
  }

  await track('checkout_started');
  const response = submitted.form
    ? NextResponse.redirect(session.url, 303)
    : NextResponse.json({ ok: true, url: session.url });
  if (!existing) {
    const cookie = walletCookieOptions();
    response.cookies.set(cookie.name, token, cookie);
  }
  return response;
}

async function readSubmission(request: Request): Promise<{ interval?: string; form: boolean }> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData();
    const value = form.get('interval');
    return { interval: typeof value === 'string' ? value : undefined, form: true };
  }
  try {
    const body = (await request.json()) as { interval?: unknown };
    return { interval: typeof body.interval === 'string' ? body.interval : undefined, form: false };
  } catch {
    return { form: false };
  }
}

function fail(form: boolean, origin: string, status: number, error: string): Response {
  if (form) {
    return NextResponse.redirect(new URL(`/pricing?error=${encodeURIComponent(error)}`, origin), 303);
  }
  return Response.json({ ok: false, error }, { status });
}
