import { consumeSlot } from '../../../lib/billing';
import { mintPiece } from '../../../lib/mint';
import { payBody, payMessage } from '../../../lib/pay';
import { siteUrl } from '../../../lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = siteUrl();
  return Response.json({
    ok: true,
    use: 'POST JSON { title, data, config?, source?, kicker?, note? }. Returns { url, png, token }. Emit ChartConfig v1. Do not invent D3. Shares the compose meter: three free a day, then the wallet cookie or Authorization: Bearer.',
    schema: `${origin}/schema/chart-config.v1.json`,
    docs: `${origin}/llms.txt`,
    agents: `${origin}/agents`,
    openapi: `${origin}/openapi.json`,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON body required', issues: [] }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ ok: false, error: 'JSON object required', issues: [] }, { status: 400 });
  }

  const minted = mintPiece(body);
  if (!minted.ok) {
    return Response.json(minted, { status: 400 });
  }

  let slot: Awaited<ReturnType<typeof consumeSlot>>;
  try {
    slot = await consumeSlot(request);
  } catch (error) {
    console.error('publish quota failed', error);
    return Response.json({ ok: false, error: 'Could not draw that. Try again in a moment.', issues: [] }, { status: 500 });
  }

  if (!slot.ok) {
    return Response.json(payBody(payMessage()), { status: 402 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const path = `/c/x/${minted.token}`;

  return Response.json({
    ok: true,
    url: `${origin}${path}`,
    png: `${origin}${path}.png`,
    token: minted.token,
  });
}
