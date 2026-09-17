import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Piece } from '../../lib/pieces';
import { ChartExtras } from './ChartExtras';
import { ChartFrame } from './ChartFrame';
import { ChartMount } from './ChartMount';
import { PinButton } from './PinButton';
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
  const TitleTag = titleAs;
  const titleInner = href ? (
    <Link href={href} className="chart-title-link">
      {piece.title}
    </Link>
  ) : (
    piece.title
  );

  return (
    <section className={['piece-stage', className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <ChartFrame
        head={
          <>
            {headLead}
            <div className="chart-frame-meta">
              <p className="chart-kicker">{piece.kicker}</p>
              {extras ? <PinButton slug={piece.slug} title={piece.title} /> : null}
            </div>
            <TitleTag id={titleId} className="chart-title">
              {titleInner}
            </TitleTag>
          </>
        }
      >
        <div className={busy ? 'piece-stage-plot is-busy' : 'piece-stage-plot'}>
          <ChartMount config={piece.config} data={piece.data} label={piece.title} framed />
          {overlay ? <div className="piece-stage-overlay">{overlay}</div> : null}
        </div>
      </ChartFrame>
      {piece.note ? <p className="studio-chart-note">{piece.note}</p> : null}
      {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
      {extras ? <ChartExtras piece={piece} /> : null}
    </section>
  );
}
