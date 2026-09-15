import { NextResponse } from 'next/server';
import { bindGoogleAccount, clearJustPaidCookieOptions, walletCookieOptions } from '../../../../lib/billing';
import { googleClientId, verifyGoogleCredential } from '../../../../lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!googleClientId()) {
    return Response.json({ ok: false, error: 'Google is not configured' }, { status: 503 });
  }

  let credential = '';
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'credential' in body && typeof body.credential === 'string') {
      credential = body.credential;
    }
  } catch {
    return Response.json({ ok: false, error: 'Could not keep that' }, { status: 400 });
  }

  let identity: { sub: string; email: string } | null;
  try {
    identity = await verifyGoogleCredential(credential);
  } catch (error) {
    console.error('google verify failed', error);
    return Response.json({ ok: false, error: 'Could not keep that' }, { status: 400 });
  }
  if (!identity) {
    return Response.json({ ok: false, error: 'Could not keep that' }, { status: 400 });
  }

  try {
    const bound = await bindGoogleAccount({ googleSub: identity.sub, googleEmail: identity.email });
    if (!bound) {
      return Response.json({ ok: false, error: 'Pay first, then keep the charts with Google.' }, { status: 404 });
    }
    const dest = NextResponse.json({
      ok: true,
      credits: bound.credits,
      unlimited: bound.unlimited,
    });
    const { name, ...opts } = walletCookieOptions();
    dest.cookies.set(name, bound.walletToken, opts);
    const paid = clearJustPaidCookieOptions();
    dest.cookies.set(paid.name, '', paid);
    return dest;
  } catch (error) {
    console.error('google bind failed', error);
    return Response.json({ ok: false, error: 'Could not keep that' }, { status: 500 });
  }
}
