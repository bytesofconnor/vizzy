import { notFound } from 'next/navigation';
import { hydrateToken } from '../../../../lib/mint';
import { SHARE_PREVIEW_HEIGHT, SHARE_PREVIEW_WIDTH } from '../../../../lib/share-channel';
import { renderSharePreview } from '../../../../lib/share-preview';

export const alt = 'Vizzy chart';
export const size = { width: SHARE_PREVIEW_WIDTH, height: SHARE_PREVIEW_HEIGHT };
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function MintedOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const piece = hydrateToken(token);
  if (!piece) {
    notFound();
  }
  return renderSharePreview(piece);
}
