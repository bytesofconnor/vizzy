import { parseCardSize } from '../../../../lib/compose';
import { loadPaste } from '../../../../lib/paste';
import { pieceBySlug } from '../../../../lib/pieces';
import { renderPiecePng } from '../../../../lib/render-piece';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('slug' in body) || typeof body.slug !== 'string') {
    return new Response('slug is required', { status: 400 });
  }

  const slug = body.slug;
  const size = parseCardSize('size' in body && typeof body.size === 'string' ? body.size : 'md');
  const insight =
    'insight' in body && typeof body.insight === 'string' ? body.insight.trim().slice(0, 1200) : undefined;

  const piece = pieceBySlug(slug) ?? (await loadPaste(slug));
  if (!piece) {
    return new Response('Not found', { status: 404 });
  }

  const png = await renderPiecePng(piece, size, insight ? { insight } : undefined);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
