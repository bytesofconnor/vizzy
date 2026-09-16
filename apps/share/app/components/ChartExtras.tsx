'use client';

import { useState } from 'react';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { sourceLine } from '../../lib/source';
import { EmbedActions } from './EmbedActions';
import { TellMeMore } from './TellMeMore';

export function ChartExtras({ piece }: { piece: Piece }) {
  const [insight, setInsight] = useState<string | null>(piece.insight ?? null);
  const source = piece.config.source ? `Source: ${sourceLine(piece.config.source)}` : undefined;

  return (
    <>
      <TellMeMore seed={seedFromPiece(piece)} presetInsight={piece.insight} onInsight={setInsight} />
      <EmbedActions
        slug={piece.slug}
        title={piece.title}
        note={piece.note}
        source={source}
        insight={insight}
      />
    </>
  );
}
