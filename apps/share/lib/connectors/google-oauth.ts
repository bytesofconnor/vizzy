import { OAuth2Client } from 'google-auth-library';
import { googleClientId } from '../google';
import type { ConnectorId } from './catalog';
import { openPayload, sealPayload } from './secrets';

const OAUTH_MS = 10 * 60 * 1000;

export function googleOAuthClient(): OAuth2Client | null {
  const clientId = googleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3456';
  return new OAuth2Client(clientId, clientSecret, `${site}/api/connectors/google/callback`);
}

export function googleOAuthReady(): boolean {
  return googleOAuthClient() !== null;
}

export function googleAuthUrl(scopes: readonly string[], state: string): string | null {
  const client = googleOAuthClient();
  if (!client) {
    return null;
  }
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [...scopes],
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = googleOAuthClient();
  if (!client) {
    return null;
  }
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !tokens.access_token) {
    return null;
  }
  return tokens;
}

export type OAuthState = {
  connectorId: ConnectorId;
  walletToken: string;
  returnTo: string;
  exp: number;
};

export function sealOAuthState(state: OAuthState): string | null {
  return sealPayload(state as unknown as Record<string, unknown>);
}

export function openOAuthState(token: string): OAuthState | null {
  const parsed = openPayload<OAuthState & Record<string, unknown>>(token);
  if (
    !parsed ||
    typeof parsed.connectorId !== 'string' ||
    typeof parsed.walletToken !== 'string' ||
    typeof parsed.returnTo !== 'string' ||
    typeof parsed.exp !== 'number'
  ) {
    return null;
  }
  if (parsed.exp < Date.now()) {
    return null;
  }
  return {
    connectorId: parsed.connectorId as ConnectorId,
    walletToken: parsed.walletToken,
    returnTo: parsed.returnTo,
    exp: parsed.exp,
  };
}

export function newOAuthState(
  connectorId: ConnectorId,
  walletToken: string,
  returnTo: string
): OAuthState {
  return {
    connectorId,
    walletToken,
    returnTo,
    exp: Date.now() + OAUTH_MS,
  };
}
