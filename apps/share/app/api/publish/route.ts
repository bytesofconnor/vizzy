import { mintPiece } from '../../../lib/mint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON body required' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ ok: false, error: 'JSON object required' }, { status: 400 });
  }

  const minted = mintPiece(body);
  if (!minted.ok) {
    return Response.json(minted, { status: 400 });
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
