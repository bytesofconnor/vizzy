import { billingConfigured, readWalletToken } from '../../../../lib/billing';
import {
  LIBRARY_PAGE_SIZE,
  bumpEvent,
  listLibraryCharts,
  removeChartsFromHistory,
} from '../../../../lib/telemetry';
import type { AccountLibraryKind } from '../../../../lib/account-chart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const kinds = new Set<AccountLibraryKind>(['all', 'pinned', 'compose', 'publish']);

export async function GET(request: Request) {
  const token = await readWalletToken();
  if (!token || !billingConfigured()) {
    return Response.json({ ok: false, error: 'Sign in to browse your charts' }, { status: 401 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const kindRaw = url.searchParams.get('kind') ?? 'all';
  const kind = kinds.has(kindRaw as AccountLibraryKind) ? (kindRaw as AccountLibraryKind) : 'all';
  const cursor = url.searchParams.get('cursor');
  try {
    const result = await listLibraryCharts(token, {
      q: q.length >= 2 ? q : undefined,
      kind,
      cursor: cursor || null,
      numItems: LIBRARY_PAGE_SIZE,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('library list failed', error);
    return Response.json({ ok: false, error: 'Could not load charts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const token = await readWalletToken();
  if (!token || !billingConfigured()) {
    return Response.json({ ok: false, error: 'Sign in to change your history' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || !('slugs' in body) || !Array.isArray(body.slugs)) {
    return Response.json({ ok: false, error: 'slugs required' }, { status: 400 });
  }
  const slugs = body.slugs.filter((slug): slug is string => typeof slug === 'string').slice(0, 40);
  if (slugs.length === 0) {
    return Response.json({ ok: false, error: 'slugs required' }, { status: 400 });
  }
  try {
    const result = await removeChartsFromHistory(token, slugs);
    await bumpEvent('tap_remove_chart');
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('library remove failed', error);
    return Response.json({ ok: false, error: 'Could not remove charts' }, { status: 500 });
  }
}
