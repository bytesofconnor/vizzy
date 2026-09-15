import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 20 * 60 * 1000;

function secret(): string {
  return process.env.COMPOSE_SALT || process.env.COMPOSE_SERVER_SECRET || 'vizzy-dev';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function signClaim(email: string, now = Date.now()): string {
  const exp = now + TTL_MS;
  const payload = `${normalizeEmail(email)}.${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyClaim(token: string): string | null {
  const cut = token.lastIndexOf('.');
  if (cut <= 0) {
    return null;
  }
  const packed = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  let payload = '';
  try {
    payload = Buffer.from(packed, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  const dot = payload.lastIndexOf('.');
  const email = payload.slice(0, dot);
  const exp = Number(payload.slice(dot + 1));
  if (!isEmail(email) || !Number.isFinite(exp) || exp < Date.now()) {
    return null;
  }
  return normalizeEmail(email);
}
