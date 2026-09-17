'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import type { ClientPiece, ComposeProgressEvent } from '../../lib/compose-progress';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { ChartExtras } from './ChartExtras';
import { ChartFrame } from './ChartFrame';
import { ChartMount } from './ChartMount';
import { ComposeBox } from './ComposeBox';
import { ComposeBusyPlot, ComposeProgressStrip } from './ComposeBusyPlot';
import { SourceLine } from './SourceLine';

const kicker: CSSProperties = {
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mute)',
  margin: 0,
};

const chartTitle: CSSProperties = {
  fontWeight: 500,
  fontSize: 'clamp(1.25rem, 5vw, 1.5rem)',
  letterSpacing: '-0.025em',
  margin: '4px 0 12px',
};

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
    <>
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
          <div className="home-chart-slot">
            <ChartFrame
              head={
                piece && !busy ? (
                  <>
                    <p style={kicker}>{piece.kicker}</p>
                    <h2 id="home-chart-title" style={chartTitle}>
                      {piece.title}
                    </h2>
                  </>
                ) : (
                  <ComposeProgressStrip progress={progress} />
                )
              }
            >
              <div className={busy ? 'home-chart-stage is-busy' : 'home-chart-stage'}>
                {piece ? (
                  <ChartMount config={piece.config} data={piece.data} label={piece.title} framed />
                ) : null}
                {busy ? (
                  <div className="home-chart-busy">
                    <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" />
                  </div>
                ) : null}
              </div>
            </ChartFrame>
            {piece && !busy ? (
              <>
                {piece.note ? <p className="studio-chart-note">{piece.note}</p> : null}
                {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
                <ChartExtras piece={piece} />
              </>
            ) : null}
          </div>
        ) : null}
      </ComposeBox>
    </>
  );
}
