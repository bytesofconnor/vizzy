import { NextResponse } from 'next/server';
import { justPaidCookieOptions, walletCookieOptions } from '../../../lib/billing';
import { fulfillCheckoutSession } from '../../../lib/fulfill';
import { stripeClient } from '../../../lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const origin = url.origin;

  let walletToken: string | undefined;

  if (sessionId) {
    const stripe = stripeClient();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const result = await fulfillCheckoutSession(session);
        if (result) {
          walletToken = result.walletToken;
        }
      } catch (error) {
        console.error('thanks fulfill failed', error);
      }
    }
  }

  const dest = NextResponse.redirect(new URL('/me', origin));
  if (walletToken) {
    const { name, ...opts } = walletCookieOptions();
    dest.cookies.set(name, walletToken, opts);
    const paid = justPaidCookieOptions();
    dest.cookies.set(paid.name, '1', paid);
  }
  return dest;
}
