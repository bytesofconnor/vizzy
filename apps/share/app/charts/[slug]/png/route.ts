import { parseCardSize } from '../../../../lib/compose';
import { galleryBySlug } from '../../../../lib/gallery';
import { loadGalleryPiece } from '../../../../lib/gallery-load';
import { renderPiecePng } from '../../../../lib/render-piece';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const chart = galleryBySlug(slug);
  if (!chart) {
    return new Response('Not found', { status: 404 });
  }
  const piece = await loadGalleryPiece(chart);
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
