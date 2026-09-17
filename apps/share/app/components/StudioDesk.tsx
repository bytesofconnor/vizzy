'use client';

import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import type { ComposeProgressEvent } from '../../lib/compose-progress';
import { ChartFrame } from './ChartFrame';
import { ChartMount } from './ChartMount';
import { ChartExtras } from './ChartExtras';
import { ComposeBox } from './ComposeBox';
import { ComposeProgressStrip } from './ComposeBusyPlot';
import { HomeCompose } from './HomeCompose';
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
      <section className="studio-chart" aria-labelledby="chart-title">
        <ChartFrame
          head={
            <>
              {progress ? <ComposeProgressStrip progress={progress} /> : null}
              <p style={kicker}>{piece.kicker}</p>
              <h1 id="chart-title" style={chartTitle}>
                {piece.title}
              </h1>
            </>
          }
        >
          <div className={progress ? 'studio-chart-stage is-busy' : 'studio-chart-stage'}>
            <ChartMount config={piece.config} data={piece.data} label={piece.title} framed />
          </div>
        </ChartFrame>
        {piece.note ? <p className="studio-chart-note">{piece.note}</p> : null}
        {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
        <ChartExtras piece={piece} />
      </section>
    </>
  );
}
