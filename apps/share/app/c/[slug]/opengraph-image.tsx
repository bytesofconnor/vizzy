import { notFound } from 'next/navigation';
import { loadPaste } from '../../../lib/paste';
import { pieceBySlug } from '../../../lib/pieces';
import { SHARE_PREVIEW_HEIGHT, SHARE_PREVIEW_WIDTH } from '../../../lib/share-channel';
import { renderSharePreview } from '../../../lib/share-preview';

export const alt = 'Vizzy chart';
export const size = { width: SHARE_PREVIEW_WIDTH, height: SHARE_PREVIEW_HEIGHT };
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function ShareOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const piece = pieceBySlug(slug) ?? (await loadPaste(slug));
  if (!piece) {
    notFound();
  }
  return renderSharePreview(piece);
}
