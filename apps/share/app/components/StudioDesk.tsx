'use client';

import { useCallback, useState } from 'react';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import type { ClientPiece, ComposeProgressEvent } from '../../lib/compose-progress';
import { ChartFrame } from './ChartFrame';
import { ComposeBox } from './ComposeBox';
import { ComposeBusyPlot, ComposeProgressStrip } from './ComposeBusyPlot';
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
  const [freshDraft, setFreshDraft] = useState(false);
  const busy = Boolean(progress);
  const revising = busy && !freshDraft;

  const onBusyProgress = useCallback((next: ComposeProgressEvent | null) => {
    setProgress(next);
    if (!next) {
      setFreshDraft(false);
    }
  }, []);
  const onMinted = useCallback((next: ClientPiece) => {
    setFreshDraft(false);
    setPiece(next);
  }, []);
  const onComposeStart = useCallback(({ fresh }: { fresh: boolean }) => {
    setFreshDraft(fresh);
  }, []);
  const onPromptIntent = useCallback(({ fresh }: { fresh: boolean }) => {
    setFreshDraft(fresh);
  }, []);

  return (
    <ComposeBox
      error={error}
      askPay={askPay}
      variant="hero"
      seed={freshDraft ? undefined : seedFromPiece(piece)}
      showIdeas={false}
      onBusyProgress={onBusyProgress}
      onComposeStart={onComposeStart}
      onPromptIntent={onPromptIntent}
      onMinted={onMinted}
    >
      {freshDraft && busy ? (
        <div className="home-chart-slot is-drafting">
          <ChartFrame head={<ComposeProgressStrip progress={progress} />}>
            <div className="piece-stage-plot">
              <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" />
            </div>
          </ChartFrame>
        </div>
      ) : (
        <PieceStage
          className="studio-chart"
          piece={piece}
          titleId="chart-title"
          titleAs="h1"
          busy={revising}
          headLead={busy ? <ComposeProgressStrip progress={progress} /> : undefined}
          overlay={
            revising ? <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" /> : undefined
          }
        />
      )}
    </ComposeBox>
  );
}
