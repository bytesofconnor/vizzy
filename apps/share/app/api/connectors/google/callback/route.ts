import { NextResponse } from 'next/server';
import { walletCookieOptions } from '../../../../../lib/billing';
import { isConnectorId } from '../../../../../lib/connectors/catalog';
import { exchangeGoogleCode, openOAuthState } from '../../../../../lib/connectors/google-oauth';
import { saveConnection } from '../../../../../lib/connectors/server';
import { sealPayload } from '../../../../../lib/connectors/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError || !code || !stateRaw) {
    return NextResponse.redirect(finishUrl(request, '/', 'denied'), 303);
  }

  const state = openOAuthState(stateRaw);
  if (!state || !isConnectorId(state.connectorId)) {
    return NextResponse.redirect(finishUrl(request, '/', 'state'), 303);
  }

  let tokens;
  try {
    tokens = await exchangeGoogleCode(code);
  } catch (error) {
    console.error('google oauth exchange failed', error);
    return NextResponse.redirect(finishUrl(request, state.returnTo, 'exchange'), 303);
  }
  if (!tokens) {
    return NextResponse.redirect(finishUrl(request, state.returnTo, 'exchange'), 303);
  }

  const sealed = sealPayload({
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiryDate: tokens.expiry_date,
  });
  if (!sealed) {
    return NextResponse.redirect(finishUrl(request, state.returnTo, 'store'), 303);
  }

  try {
    const ok = await saveConnection({
      walletToken: state.walletToken,
      connectorId: state.connectorId,
      secrets: sealed,
      label: 'Google',
    });
    if (!ok) {
      return NextResponse.redirect(finishUrl(request, state.returnTo, 'store'), 303);
    }
  } catch (error) {
    console.error('connection save failed', error);
    return NextResponse.redirect(finishUrl(request, state.returnTo, 'store'), 303);
  }

  const dest = NextResponse.redirect(finishUrl(request, state.returnTo, null, state.connectorId), 303);
  const { name, ...opts } = walletCookieOptions();
  dest.cookies.set(name, state.walletToken, opts);
  return dest;
}

function finishUrl(
  request: Request,
  returnTo: string,
  error: string | null,
  connected?: string
): URL {
  const dest = new URL(returnTo, request.url);
  if (connected) {
    dest.searchParams.set('connected', connected);
  }
  if (error) {
    dest.searchParams.set('connect_error', error);
  }
  return dest;
}
