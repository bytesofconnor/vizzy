import { NextResponse } from 'next/server';
import { walletCookieOptions, walletTokenForEmail } from '../../../lib/billing';
import { verifyClaim } from '../../../lib/claim';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('t') ? verifyClaim(url.searchParams.get('t')!) : null;
  const origin = url.origin;

  if (email) {
    try {
      const token = await walletTokenForEmail(email);
      if (token) {
        const dest = NextResponse.redirect(new URL('/', origin));
        const { name, ...opts } = walletCookieOptions();
        dest.cookies.set(name, token, opts);
        return dest;
      }
    } catch (error) {
      console.error('claim failed', error);
    }
  }

  return NextResponse.redirect(
    new URL(`/?error=${encodeURIComponent('That restore link is dead. Send another from Terms.')}`, origin),
  );
}
