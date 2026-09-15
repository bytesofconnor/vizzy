import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { FREE_PER_DAY, JUST_PAID_COOKIE, PACK_CREDITS, PACK_PRICE_LABEL, WALLET_COOKIE } from './pack';

export type Quota = {
  configured: boolean;
  canCompose: boolean;
  freeLeft: number;
  credits: number;
  unlimited: boolean;
  saved: boolean;
  justPaid: boolean;
  offerGoogle: boolean;
  email?: string;
  packCredits: number;
  packPriceLabel: string;
};

export type ConsumeResult = {
  ok: boolean;
  via: 'credit' | 'free' | 'pay' | 'open' | 'owner';
  freeLeft: number;
  credits: number;
};

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

function serverSecret(): string | undefined {
  return process.env.COMPOSE_SERVER_SECRET;
}

export function billingConfigured(): boolean {
  return Boolean(convexUrl() && serverSecret());
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T> {
  const url = convexUrl();
  if (!url) {
    throw new Error('Convex is not configured');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  const body = (await response.json()) as ConvexResult<T>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'Convex call failed');
  }
  return body.value;
}

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function hashIp(ip: string): string {
  const salt = process.env.COMPOSE_SALT || serverSecret() || 'vizzy-dev';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function newWalletToken(): string {
  return randomBytes(24).toString('hex');
}

export async function readWalletToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(WALLET_COOKIE)?.value;
}

function normalizeWalletToken(raw: string): string | undefined {
  const token = raw.trim();
  if (!token) {
    return undefined;
  }
  if (token.toLowerCase().startsWith('vizzy_')) {
    const inner = token.slice(6);
    return inner || undefined;
  }
  return token;
}

export async function walletTokenFromRequest(request?: Request): Promise<string | undefined> {
  const header = request?.headers.get('authorization');
  if (header) {
    const match = header.match(/^Bearer\s+(\S+)/i);
    if (match?.[1]) {
      const fromHeader = normalizeWalletToken(match[1]);
      if (fromHeader) {
        return fromHeader;
      }
    }
  }
  return readWalletToken();
}

export function walletCookieOptions() {
  return {
    name: WALLET_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  };
}

export function justPaidCookieOptions() {
  return {
    name: JUST_PAID_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 20,
  };
}

export function clearJustPaidCookieOptions() {
  return {
    ...justPaidCookieOptions(),
    maxAge: 0,
  };
}

export async function peekQuota(request: Request): Promise<Quota> {
  const pack = { packCredits: PACK_CREDITS, packPriceLabel: PACK_PRICE_LABEL };
  if (!billingConfigured()) {
    return {
      configured: false,
      canCompose: true,
      freeLeft: FREE_PER_DAY,
      credits: 0,
      unlimited: true,
      saved: false,
      justPaid: false,
      offerGoogle: false,
      ...pack,
    };
  }
  const secret = serverSecret();
  if (!secret) {
    return {
      configured: false,
      canCompose: true,
      freeLeft: FREE_PER_DAY,
      credits: 0,
      unlimited: true,
      saved: false,
      justPaid: false,
      offerGoogle: false,
      ...pack,
    };
  }
  const status = await convexCall<
    Omit<Quota, 'configured' | 'packCredits' | 'packPriceLabel' | 'offerGoogle' | 'justPaid'>
  >('query', 'billing:peek', {
    secret,
    ipHash: hashIp(requestIp(request)),
    day: utcDay(),
    walletToken: await walletTokenFromRequest(request),
  });
  const jar = await cookies();
  const justPaid = Boolean(jar.get(JUST_PAID_COOKIE)?.value);
  return {
    configured: true,
    ...status,
    ...pack,
    justPaid,
    offerGoogle: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && justPaid && !status.saved,
  };
}

export async function signedInNavEmail(): Promise<string | undefined> {
  if (!billingConfigured()) {
    return undefined;
  }
  const secret = serverSecret();
  const token = await readWalletToken();
  if (!secret || !token) {
    return undefined;
  }
  try {
    const status = await convexCall<{ saved?: boolean; email?: string }>('query', 'billing:peek', {
      secret,
      ipHash: 'nav',
      day: utcDay(),
      walletToken: token,
    });
    if (status.saved && status.email) {
      return status.email;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function consumeSlot(request: Request): Promise<ConsumeResult> {
  if (!billingConfigured()) {
    return { ok: true, via: 'open', freeLeft: FREE_PER_DAY, credits: 0 };
  }
  const secret = serverSecret();
  if (!secret) {
    return { ok: true, via: 'open', freeLeft: FREE_PER_DAY, credits: 0 };
  }
  return convexCall<ConsumeResult>('mutation', 'billing:consume', {
    secret,
    ipHash: hashIp(requestIp(request)),
    day: utcDay(),
    walletToken: await walletTokenFromRequest(request),
  });
}

export async function refundSlot(request: Request, via: 'credit' | 'free'): Promise<void> {
  if (!billingConfigured()) {
    return;
  }
  const secret = serverSecret();
  if (!secret) {
    return;
  }
  await convexCall('mutation', 'billing:refund', {
    secret,
    ipHash: hashIp(requestIp(request)),
    day: utcDay(),
    via,
    walletToken: await walletTokenFromRequest(request),
  });
}

export async function ensureWallet(token: string): Promise<void> {
  const secret = serverSecret();
  if (!billingConfigured() || !secret) {
    return;
  }
  await convexCall('mutation', 'billing:ensureWallet', { secret, token });
}

export async function creditPurchase(input: {
  walletToken: string;
  stripeSessionId: string;
  credits: number;
  stripeCustomerId?: string;
  email?: string;
}): Promise<{ ok: boolean; duplicate: boolean; credits: number; walletToken: string }> {
  const secret = serverSecret();
  if (!billingConfigured() || !secret) {
    throw new Error('Billing is not configured');
  }
  return convexCall('mutation', 'billing:creditFromStripe', { secret, ...input });
}

export type WalletOrder = {
  createdAt: number;
  credits: number;
};

export type WalletState = {
  token: string;
  credits: number;
  email?: string;
  stripeCustomerId?: string;
  orders: Array<WalletOrder & { stripeSessionId: string }>;
};

export async function listWalletOrders(): Promise<WalletOrder[]> {
  const state = await getWalletState();
  return state?.orders ?? [];
}

export async function getWalletState(): Promise<WalletState | null> {
  const token = await readWalletToken();
  if (!token) {
    return null;
  }
  return getWalletByToken(token);
}

export async function getWalletByToken(token: string): Promise<WalletState | null> {
  const secret = serverSecret();
  if (!billingConfigured() || !secret) {
    return null;
  }
  return convexCall<WalletState | null>('query', 'billing:getWallet', { secret, walletToken: token });
}

export async function attachWalletEmail(email: string): Promise<{ walletToken: string; credits: number } | null> {
  const secret = serverSecret();
  const token = await readWalletToken();
  if (!billingConfigured() || !secret || !token) {
    return null;
  }
  return convexCall('mutation', 'billing:attachEmail', { secret, walletToken: token, email });
}

export async function walletTokenForEmail(email: string): Promise<string | null> {
  const secret = serverSecret();
  if (!billingConfigured() || !secret) {
    return null;
  }
  return convexCall<string | null>('query', 'billing:walletTokenForEmail', { secret, email });
}

export async function bindGoogleAccount(input: {
  googleSub: string;
  googleEmail: string;
}): Promise<{ walletToken: string; credits: number; unlimited: boolean } | null> {
  const secret = serverSecret();
  if (!billingConfigured() || !secret) {
    return null;
  }
  return convexCall<{ walletToken: string; credits: number; unlimited: boolean } | null>('mutation', 'billing:bindGoogle', {
    secret,
    walletToken: await readWalletToken(),
    googleSub: input.googleSub,
    googleEmail: input.googleEmail,
  });
}

export type AccountDay = {
  day: string;
  charts: number;
};

export type Account = {
  email?: string;
  credits: number;
  unlimited: boolean;
  saved: boolean;
  used: number;
  days: AccountDay[];
  orders: WalletOrder[];
  justPaid: boolean;
};

export async function getAccount(): Promise<Account | null> {
  const token = await readWalletToken();
  const secret = serverSecret();
  if (!token || !billingConfigured() || !secret) {
    return null;
  }
  const account = await convexCall<Omit<Account, 'justPaid'> | null>('query', 'billing:getAccount', {
    secret,
    walletToken: token,
    now: Date.now(),
  });
  if (!account) {
    return null;
  }
  const jar = await cookies();
  return {
    ...account,
    justPaid: Boolean(jar.get(JUST_PAID_COOKIE)?.value),
  };
}
