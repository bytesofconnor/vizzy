import { randomBytes } from 'node:crypto';
import { PIECES, type Piece } from './pieces';
import { hydrateToken } from './mint';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

const TAKEN = new Set(['x', ...PIECES.map((piece) => piece.slug)]);

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

function serverSecret(): string | undefined {
  return process.env.COMPOSE_SERVER_SECRET;
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T> {
  const url = convexUrl();
  const secret = serverSecret();
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

function newSlug(): string {
  return randomBytes(6).toString('base64url');
}

export async function savePaste(token: string): Promise<string | undefined> {
  if (!convexUrl() || !serverSecret()) {
    return undefined;
  }
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const slug = newSlug();
      if (TAKEN.has(slug)) {
        continue;
      }
      const result = await convexCall<'ok' | 'taken'>('mutation', 'pastes:put', { slug, token });
      if (result === 'ok') {
        return slug;
      }
    }
  } catch (error) {
    console.error('paste save failed', error);
  }
  return undefined;
}

export async function loadPaste(slug: string): Promise<Piece | null> {
  if (!convexUrl() || !serverSecret() || TAKEN.has(slug)) {
    return null;
  }
  try {
    const row = await convexCall<{ token: string } | null>('query', 'pastes:get', { slug });
    if (!row) {
      return null;
    }
    return hydrateToken(row.token, slug);
  } catch (error) {
    console.error('paste load failed', error);
    return null;
  }
}

export async function pasteHref(
  origin: string,
  token: string
): Promise<{ url: string; png: string; token: string; slug?: string }> {
  const slug = await savePaste(token);
  const path = slug ? `/c/${slug}` : `/c/x/${token}`;
  return {
    url: `${origin}${path}`,
    png: `${origin}${path}.png`,
    token,
    slug,
  };
}
