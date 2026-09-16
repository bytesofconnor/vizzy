'use client';

import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { sourceLine } from '../../lib/source';
import { EmbedActions } from './EmbedActions';

export function ChartExtras({ piece }: { piece: Piece }) {
  const source = piece.config.source ? `Source: ${sourceLine(piece.config.source)}` : undefined;

  return (
    <EmbedActions
      slug={piece.slug}
      title={piece.title}
      note={piece.note}
      source={source}
      seed={seedFromPiece(piece)}
      presetInsight={piece.insight}
    />
  );
}
