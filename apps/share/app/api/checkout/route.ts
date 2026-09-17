import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  billingConfigured,
  ensureWallet,
  getWalletByToken,
  newWalletToken,
  readWalletToken,
  walletCookieOptions,
} from '../../../lib/billing';
import { PACK_CREDITS } from '../../../lib/pack';
import { bumpEvent } from '../../../lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    return await startCheckout(request);
  } catch (error) {
    console.error('checkout failed', error);
    return Response.json({ ok: false, error: publicCheckoutError(error) }, { status: 502 });
  }
}

async function startCheckout(request: Request) {
  const { packLineItem, stripeClient } = await import('../../../lib/stripe');
  const stripe = stripeClient();
  if (!stripe || !billingConfigured()) {
    return Response.json({ ok: false, error: 'Payments are not configured' }, { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const existing = await readWalletToken();
  const token = existing ?? newWalletToken();
  await ensureWallet(token);
  const wallet = await getWalletByToken(token);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [packLineItem()],
    success_url: `${origin}/pay/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/me`,
    client_reference_id: token,
    metadata: {
      walletToken: token,
      credits: String(PACK_CREDITS),
    },
    allow_promotion_codes: true,
    custom_text: {
      submit: {
        message: wallet?.email
          ? 'These charts add to the ones on this browser.'
          : 'Paid charts follow the email you use here.',
      },
    },
  };
  if (wallet?.stripeCustomerId) {
    params.customer = wallet.stripeCustomerId;
  } else if (wallet?.email) {
    params.customer_email = wallet.email;
  } else {
    params.customer_creation = 'always';
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    if (params.customer) {
      delete params.customer;
      if (wallet?.email) {
        params.customer_email = wallet.email;
      } else {
        params.customer_creation = 'always';
      }
      session = await stripe.checkout.sessions.create(params);
    } else {
      throw error;
    }
  }

  if (!session.url) {
    return Response.json({ ok: false, error: 'Could not start checkout' }, { status: 502 });
  }

  await bumpEvent('checkout');
  const response = NextResponse.json({ ok: true, url: session.url });
  if (!existing) {
    const cookie = walletCookieOptions();
    response.cookies.set(cookie.name, token, cookie);
  }
  return response;
}

function publicCheckoutError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/no such price|invalid api key|no such customer/i.test(message)) {
    return 'Payments are misconfigured.';
  }
  return 'Could not start checkout. Try again in a moment.';
}
