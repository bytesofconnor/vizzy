import type { CSSProperties } from 'react';
import Link from 'next/link';
import { PIECES, type Piece } from '../../lib/pieces';
import { DustRail } from './DustRail';
import { ChartMount } from './ChartMount';
import { HomeCompose } from './HomeCompose';
import { ChartExtras } from './ChartExtras';
import { KickerNav } from './KickerNav';
import { SiteFoot } from './SiteFoot';
import { SourceLine } from './SourceLine';
import { StudioDesk } from './StudioDesk';

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

export function Studio({
  piece,
  error,
  askPay,
  email,
  known,
  owner = false,
}: {
  piece?: Piece;
  error?: string;
  askPay?: boolean;
  email?: string;
  known?: boolean;
  owner?: boolean;
}) {
  return (
    <main id="content" className={`page-main${piece ? '' : ' page-home'}`}>
      <KickerNav here="home" email={email} known={known} owner={owner} />
      {piece ? (
        <StudioDesk piece={piece} error={error} askPay={askPay} />
      ) : (
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title" className="home-hero-title">
            Turn a question into a publish-ready chart
          </h1>
          <DustRail className="home-hero-dust dust-rail is-idle" />
          <p className="home-hero-lede">
            AI drafts the series. You get a link and PNG. Add a source when you have one — it shows on
            the chart.
          </p>
          <HomeCompose error={error} askPay={askPay} />
        </section>
      )}
      <div id="examples" className={piece ? undefined : 'home-examples'}>
        <ExampleList skip={piece?.slug} home={!piece} />
      </div>
      <SiteFoot />
    </main>
  );
}

function ExampleList({ skip, home = false }: { skip?: string; home?: boolean }) {
  const pieces = PIECES.filter((piece) => piece.slug !== skip);
  if (pieces.length === 0) {
    return null;
  }

  return (
    <>
      <p style={{ ...kicker, marginTop: home ? 36 : 28 }}>Examples</p>
      <div className="piece-list">
        {pieces.map((piece) => (
          <article key={piece.slug}>
            <Link href={`/c/${piece.slug}`} style={{ textDecoration: 'none' }}>
              <p style={kicker}>{piece.kicker}</p>
              <h2 style={chartTitle}>{piece.title}</h2>
            </Link>
            <ChartMount config={piece.config} data={piece.data} label={piece.title} />
            <p
              style={{
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                color: 'var(--mute)',
                margin: '10px 0 0',
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {piece.note}
            </p>
            {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
            <ChartExtras piece={piece} />
          </article>
        ))}
      </div>
    </>
  );
}
