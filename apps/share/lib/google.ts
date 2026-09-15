import { createHmac, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

const PENDING_COOKIE = 'vizzy_google';
const PENDING_MS = 10 * 60 * 1000;

export function googleClientId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || undefined;
}

export async function verifyGoogleCredential(
  credential: string,
): Promise<{ sub: string; email: string } | null> {
  const clientId = googleClientId();
  if (!clientId) {
    return null;
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return null;
  }
  return { sub: payload.sub, email: payload.email };
}

export function googlePendingCookieOptions() {
  return {
    name: PENDING_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(PENDING_MS / 1000),
  };
}

export function clearGooglePendingCookieOptions() {
  return {
    ...googlePendingCookieOptions(),
    maxAge: 0,
  };
}

export function sealGooglePending(identity: { sub: string; email: string }): string | null {
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!secret) {
    return null;
  }
  const body = Buffer.from(
    JSON.stringify({ sub: identity.sub, email: identity.email, exp: Date.now() + PENDING_MS }),
    'utf8'
  ).toString('base64url');
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function openGooglePending(token: string): { sub: string; email: string } | null {
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!secret) {
    return null;
  }
  const split = token.split('.');
  const body = split[0];
  const mac = split[1];
  if (!body || !mac || split.length !== 2) {
    return null;
  }
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('sub' in parsed) ||
      !('email' in parsed) ||
      !('exp' in parsed) ||
      typeof parsed.sub !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) {
      return null;
    }
    return { sub: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}
