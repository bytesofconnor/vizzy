import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { bindGoogleAccount, clearJustPaidCookieOptions, walletCookieOptions } from '../../../../lib/billing';
import {
  clearGooglePendingCookieOptions,
  googleClientId,
  googlePendingCookieOptions,
  openGooglePending,
  sealGooglePending,
  verifyGoogleCredential,
} from '../../../../lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function me(request: Request, query?: string) {
  const url = new URL('/me', request.url);
  if (query) {
    url.search = query;
  }
  return url;
}

function continueUrl(request: Request) {
  return new URL('/api/save/google', request.url);
}

async function attachWallet(
  identity: { sub: string; email: string },
  asJson: boolean,
  request: Request
) {
  const bound = await bindGoogleAccount({ googleSub: identity.sub, googleEmail: identity.email });
  if (!bound) {
    if (asJson) {
      return Response.json({ ok: false, error: 'No charts on that Google account yet.' }, { status: 404 });
    }
    return NextResponse.redirect(me(request, 'signin=missing'), 303);
  }
  const dest = asJson
    ? NextResponse.json({
        ok: true,
        credits: bound.credits,
        unlimited: bound.unlimited,
      })
    : NextResponse.redirect(me(request), 303);
  const { name, ...opts } = walletCookieOptions();
  dest.cookies.set(name, bound.walletToken, opts);
  const paid = clearJustPaidCookieOptions();
  dest.cookies.set(paid.name, '', paid);
  const pending = clearGooglePendingCookieOptions();
  dest.cookies.set(pending.name, '', pending);
  return dest;
}

export async function GET(request: Request) {
  if (!googleClientId()) {
    return NextResponse.redirect(me(request), 303);
  }
  const jar = await cookies();
  const pending = jar.get(googlePendingCookieOptions().name)?.value;
  const identity = pending ? openGooglePending(pending) : null;
  if (!identity) {
    return NextResponse.redirect(me(request), 303);
  }
  try {
    return await attachWallet(identity, false, request);
  } catch (error) {
    console.error('google bind failed', error);
    return NextResponse.redirect(me(request), 303);
  }
}

export async function POST(request: Request) {
  if (!googleClientId()) {
    return Response.json({ ok: false, error: 'Google is not configured' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const fromGoogle = !contentType.includes('application/json');

  let credential = '';
  if (fromGoogle) {
    const form = await request.formData();
    const csrfBody = String(form.get('g_csrf_token') ?? '');
    const jar = await cookies();
    const csrfCookie = jar.get('g_csrf_token')?.value ?? '';
    if (!csrfBody || !csrfCookie || csrfBody !== csrfCookie) {
      return NextResponse.redirect(me(request), 303);
    }
    credential = String(form.get('credential') ?? '');
  } else {
    try {
      const body: unknown = await request.json();
      if (typeof body === 'object' && body !== null && 'credential' in body && typeof body.credential === 'string') {
        credential = body.credential;
      }
    } catch {
      return Response.json({ ok: false, error: 'Could not sign in' }, { status: 400 });
    }
  }

  let identity: { sub: string; email: string } | null;
  try {
    identity = await verifyGoogleCredential(credential);
  } catch (error) {
    console.error('google verify failed', error);
    if (fromGoogle) {
      return NextResponse.redirect(me(request), 303);
    }
    return Response.json({ ok: false, error: 'Could not sign in' }, { status: 400 });
  }
  if (!identity) {
    if (fromGoogle) {
      return NextResponse.redirect(me(request), 303);
    }
    return Response.json({ ok: false, error: 'Could not sign in' }, { status: 400 });
  }

  if (fromGoogle) {
    const sealed = sealGooglePending(identity);
    if (!sealed) {
      return NextResponse.redirect(me(request), 303);
    }
    const dest = NextResponse.redirect(continueUrl(request), 303);
    const pending = googlePendingCookieOptions();
    dest.cookies.set(pending.name, sealed, pending);
    return dest;
  }

  try {
    return await attachWallet(identity, true, request);
  } catch (error) {
    console.error('google bind failed', error);
    return Response.json({ ok: false, error: 'Could not sign in' }, { status: 500 });
  }
}
