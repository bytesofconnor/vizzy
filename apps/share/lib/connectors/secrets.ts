import { createHmac, timingSafeEqual } from 'node:crypto';

export function sealPayload(payload: Record<string, unknown>): string | null {
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!secret) {
    return null;
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function openPayload<T extends Record<string, unknown>>(token: string): T | null {
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
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}
