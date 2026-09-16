import { NextResponse } from 'next/server';
import {
  ensureWallet,
  newWalletToken,
  readWalletToken,
  walletCookieOptions,
} from '../../../../../lib/billing';
import { CONNECTOR_BY_ID, isConnectorId } from '../../../../../lib/connectors/catalog';
import {
  googleAuthUrl,
  googleOAuthReady,
  newOAuthState,
  sealOAuthState,
} from '../../../../../lib/connectors/google-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!googleOAuthReady()) {
    return NextResponse.redirect(new URL('/?connect_error=google', request.url), 303);
  }

  const url = new URL(request.url);
  const connectorRaw = url.searchParams.get('connector') ?? 'sheets';
  if (!isConnectorId(connectorRaw)) {
    return NextResponse.redirect(new URL('/', request.url), 303);
  }
  const connector = CONNECTOR_BY_ID[connectorRaw];
  if (connector.connect.kind !== 'oauth' || connector.connect.provider !== 'google') {
    return NextResponse.redirect(new URL('/', request.url), 303);
  }

  let walletToken = await readWalletToken();
  if (!walletToken) {
    walletToken = newWalletToken();
    await ensureWallet(walletToken);
  }

  const returnTo = safeReturn(url.searchParams.get('return') ?? '/');
  const state = sealOAuthState(newOAuthState(connectorRaw, walletToken, returnTo));
  if (!state) {
    return NextResponse.redirect(new URL('/?connect_error=state', request.url), 303);
  }

  const authUrl = googleAuthUrl(connector.connect.scopes, state);
  if (!authUrl) {
    return NextResponse.redirect(new URL('/?connect_error=google', request.url), 303);
  }

  const dest = NextResponse.redirect(authUrl, 303);
  const { name, ...opts } = walletCookieOptions();
  dest.cookies.set(name, walletToken, opts);
  return dest;
}

function safeReturn(value: string): string {
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/';
}
