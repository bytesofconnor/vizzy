import { parseCardSize } from '../../../../../lib/compose';
import { hydrateToken } from '../../../../../lib/mint';
import { renderPiecePng } from '../../../../../lib/render-piece';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const piece = hydrateToken(token);
  if (!piece) {
    return new Response('Not found', { status: 404 });
  }

  const size = parseCardSize(new URL(request.url).searchParams.get('size'));
  const png = await renderPiecePng(piece, size);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
