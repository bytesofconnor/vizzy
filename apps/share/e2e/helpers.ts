import { WALLET_COOKIE } from '../lib/pack';

export const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3456';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

export function ownerEmail(): string | undefined {
  const listed = process.env.E2E_OWNER_EMAIL || process.env.OWNER_EMAILS?.split(',')[0];
  const email = listed?.trim();
  return email || undefined;
}

export function composeSecret(): string | undefined {
  return process.env.COMPOSE_SERVER_SECRET;
}

export function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

export function billingReady(): boolean {
  return Boolean(convexUrl() && composeSecret());
}

export function stripeReady(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export async function convexCall<T>(
  kind: 'query' | 'mutation',
  path: string,
  args: Record<string, unknown>,
): Promise<T> {
  const url = convexUrl();
  const secret = composeSecret();
  if (!url || !secret) {
    throw new Error('Convex is not configured');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: { secret, ...args }, format: 'json' }),
  });
  const body = (await response.json()) as ConvexResult<T>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'Convex call failed');
  }
  return body.value;
}

export async function ownerWalletToken(): Promise<string | null> {
  const email = ownerEmail();
  if (!email) {
    return null;
  }
  return convexCall<string | null>('query', 'billing:walletTokenForEmail', { email });
}

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export { WALLET_COOKIE };
