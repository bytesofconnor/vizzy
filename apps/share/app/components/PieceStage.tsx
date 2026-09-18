'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { displayChartTitle } from '../../lib/remix-prompt';
import { ChartActionBar } from './ChartActionBar';
import { ChartExtras } from './ChartExtras';
import { ChartFrame } from './ChartFrame';
import { ChartMount } from './ChartMount';
import { SourceLine } from './SourceLine';

export function PieceStage({
  piece,
  titleId,
  titleAs = 'h2',
  href,
  extras = true,
  busy = false,
  overlay,
  headLead,
  className,
}: {
  piece: Piece;
  titleId?: string;
  titleAs?: 'h1' | 'h2';
  href?: string;
  extras?: boolean;
  busy?: boolean;
  overlay?: ReactNode;
  headLead?: ReactNode;
  className?: string;
}) {
  const shownTitle = displayChartTitle(piece.title, piece.note);
  const TitleTag = titleAs;
  const titleInner = href ? (
    <Link href={href} className="chart-title-link">
      {shownTitle}
    </Link>
  ) : (
    shownTitle
  );
  const [insight, setInsight] = useState<string | null>(piece.insight ?? null);
  const seed = useMemo(() => seedFromPiece(piece), [piece]);

  useEffect(() => {
    setInsight(piece.insight ?? null);
  }, [piece.slug, piece.insight]);

  return (
    <section className={['piece-stage', className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <ChartFrame
        head={
          <>
            {headLead}
            <div className="chart-frame-meta">
              <p className="chart-kicker">{piece.kicker}</p>
              {extras ? <ChartActionBar piece={piece} insight={insight} /> : null}
            </div>
            <TitleTag id={titleId} className="chart-title">
              {titleInner}
            </TitleTag>
          </>
        }
        foot={
          piece.note || piece.config.source ? (
            <>
              {piece.note ? <p className="studio-chart-note">{piece.note}</p> : null}
              {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
            </>
          ) : null
        }
      >
        <div className={busy ? 'piece-stage-plot is-busy' : 'piece-stage-plot'}>
          <ChartMount config={piece.config} data={piece.data} label={shownTitle} framed />
          {overlay ? <div className="piece-stage-overlay">{overlay}</div> : null}
        </div>
      </ChartFrame>
      {extras ? <ChartExtras seed={seed} presetInsight={piece.insight} onInsight={setInsight} /> : null}
    </section>
  );
}
