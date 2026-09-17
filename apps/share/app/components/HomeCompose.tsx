'use client';

import { useCallback, useState } from 'react';
import type { ClientPiece, ComposeProgressEvent } from '../../lib/compose-progress';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { ChartFrame } from './ChartFrame';
import { ComposeBox } from './ComposeBox';
import { ComposeBusyPlot, ComposeProgressStrip } from './ComposeBusyPlot';
import { PieceStage } from './PieceStage';

export function HomeCompose({ error, askPay }: { error?: string; askPay?: boolean }) {
  const [piece, setPiece] = useState<Piece | null>(null);
  const [progress, setProgress] = useState<ComposeProgressEvent | null>(null);
  const busy = progress !== null;
  const showStage = busy || Boolean(piece);

  const onMinted = useCallback((next: ClientPiece) => {
    setPiece(next);
  }, []);

  const onNewChart = useCallback(() => {
    setPiece(null);
    setProgress(null);
  }, []);

  return (
    <ComposeBox
      error={error}
      askPay={askPay}
      variant="hero"
      seed={piece ? seedFromPiece(piece) : undefined}
      onBusyProgress={setProgress}
      onMinted={onMinted}
      onNewChart={onNewChart}
      showIdeas={!showStage}
    >
      {showStage ? (
        piece ? (
          <PieceStage
            className="home-chart-slot"
            piece={piece}
            titleId="home-chart-title"
            busy={busy}
            headLead={busy ? <ComposeProgressStrip progress={progress} /> : undefined}
            overlay={
              busy ? <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" /> : undefined
            }
          />
        ) : (
          <div className="home-chart-slot">
            <ChartFrame head={<ComposeProgressStrip progress={progress} />}>
              <div className="piece-stage-plot">
                <div className="piece-stage-overlay">
                  <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" />
                </div>
              </div>
            </ChartFrame>
          </div>
        )
      ) : null}
    </ComposeBox>
  );
}
