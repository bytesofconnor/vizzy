'use client';

import { useCallback, useState } from 'react';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import type { ComposeProgressEvent } from '../../lib/compose-progress';
import { ComposeBox } from './ComposeBox';
import { ComposeProgressStrip } from './ComposeBusyPlot';
import { HomeCompose } from './HomeCompose';
import { PieceStage } from './PieceStage';

export function StudioDesk({
  piece,
  error,
  askPay,
}: {
  piece: Piece;
  error?: string;
  askPay?: boolean;
}) {
  const [progress, setProgress] = useState<ComposeProgressEvent | null>(null);
  const [fresh, setFresh] = useState(false);
  const onBusyProgress = useCallback((next: ComposeProgressEvent | null) => {
    setProgress(next);
  }, []);

  if (fresh) {
    return <HomeCompose error={error} askPay={askPay} />;
  }

  return (
    <>
      <ComposeBox
        error={error}
        askPay={askPay}
        seed={seedFromPiece(piece)}
        onBusyProgress={onBusyProgress}
        onNewChart={() => setFresh(true)}
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
