import { NextResponse } from 'next/server';
import {
  billingConfigured,
  ensureWallet,
  newWalletToken,
  readWalletToken,
  walletCookieOptions,
} from '../../../lib/billing';
import { bumpEvent, chartIsPinned, setChartPinned } from '../../../lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugOf(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const slug = value.trim();
  if (!slug || slug.length > 64) {
    return undefined;
  }
  return slug;
}

export async function GET(request: Request) {
  const slug = slugOf(new URL(request.url).searchParams.get('slug'));
  if (!slug) {
    return Response.json({ ok: false, error: 'slug required' }, { status: 400 });
  }
  const token = await readWalletToken();
  if (!token || !billingConfigured()) {
    return Response.json({ ok: true, pinned: false });
  }
  try {
    const pinned = await chartIsPinned(token, slug);
    return Response.json({ ok: true, pinned });
  } catch (error) {
    console.error('pin status failed', error);
    return Response.json({ ok: false, error: 'Could not read pin' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  const slug = slugOf('slug' in body ? body.slug : undefined);
  if (!slug) {
    return Response.json({ ok: false, error: 'slug required' }, { status: 400 });
  }
  const pinned = 'pinned' in body ? Boolean(body.pinned) : true;
  const title =
    'title' in body && typeof body.title === 'string' ? body.title.trim().slice(0, 160) : undefined;
  if (!billingConfigured()) {
    return Response.json({ ok: false, error: 'Pinning is not configured' }, { status: 503 });
  }

  const existing = await readWalletToken();
  const token = existing ?? newWalletToken();
  await ensureWallet(token);
  try {
    const result = await setChartPinned({
      walletToken: token,
      slug,
      pinned,
      ...(title ? { title } : {}),
      route: 'compose',
    });
    await bumpEvent(result.pinned ? 'tap_pin_chart' : 'tap_unpin_chart');
    const response = NextResponse.json({ ok: true, pinned: result.pinned });
    if (!existing) {
      const cookie = walletCookieOptions();
      response.cookies.set(cookie.name, token, cookie);
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not pin chart';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
