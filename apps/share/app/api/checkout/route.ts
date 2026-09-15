import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  billingConfigured,
  ensureWallet,
  getWalletByToken,
  newWalletToken,
  readWalletToken,
  walletCookieOptions,
} from '../../../lib/billing';
import { PACK_CREDITS } from '../../../lib/pack';
import { packLineItem, stripeClient } from '../../../lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    cancel_url: origin,
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

  let session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    if (params.customer) {
      delete params.customer;
      if (wallet?.email) {
        params.customer_email = wallet.email;
      }
      try {
        session = await stripe.checkout.sessions.create(params);
      } catch (retryError) {
        const message = retryError instanceof Error ? retryError.message : 'Could not start checkout';
        return Response.json({ ok: false, error: message }, { status: 502 });
      }
    } else {
      const message = error instanceof Error ? error.message : 'Could not start checkout';
      return Response.json({ ok: false, error: message }, { status: 502 });
    }
  }

  if (!session.url) {
    return Response.json({ ok: false, error: 'Could not start checkout' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, url: session.url });
  if (!existing) {
    const cookie = walletCookieOptions();
    response.cookies.set(cookie.name, token, cookie);
  }
  return response;
}
