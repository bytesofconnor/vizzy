'use client';

import { useCallback, useState } from 'react';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import type { ClientPiece, ComposeProgressEvent } from '../../lib/compose-progress';
import { ComposeBox } from './ComposeBox';
import { ComposeProgressStrip } from './ComposeBusyPlot';
import { PieceStage } from './PieceStage';

export function StudioDesk({
  piece: initial,
  error,
  askPay,
}: {
  piece: Piece;
  error?: string;
  askPay?: boolean;
}) {
  const [piece, setPiece] = useState<Piece>(initial);
  const [progress, setProgress] = useState<ComposeProgressEvent | null>(null);
  const onBusyProgress = useCallback((next: ComposeProgressEvent | null) => {
    setProgress(next);
  }, []);
  const onMinted = useCallback((next: ClientPiece) => {
    setPiece(next);
  }, []);

  return (
    <>
      <ComposeBox
        error={error}
        askPay={askPay}
        variant="hero"
        seed={seedFromPiece(piece)}
        onBusyProgress={onBusyProgress}
        onMinted={onMinted}
      />
      <PieceStage
        className="studio-chart"
        piece={piece}
        titleId="chart-title"
        titleAs="h1"
        busy={Boolean(progress)}
        headLead={progress ? <ComposeProgressStrip progress={progress} /> : undefined}
      />
    </>
  );
}
