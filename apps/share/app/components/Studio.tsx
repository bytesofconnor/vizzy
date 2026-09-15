import type { CSSProperties } from 'react';
import Link from 'next/link';
import { PIECES, type Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { sourceLine } from '../../lib/source';
import { DUST, STUDIO } from '../../lib/theme';
import { ChartMount } from './ChartMount';
import { ComposeBox } from './ComposeBox';
import { EmbedActions } from './EmbedActions';
import { KickerNav } from './KickerNav';
import { SiteFoot } from './SiteFoot';
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

export function Studio({
  piece,
  error,
  askPay,
  email,
  known,
}: {
  piece?: Piece;
  error?: string;
  askPay?: boolean;
  email?: string;
  known?: boolean;
}) {
  return (
    <main id="content" className="page-main">
      <KickerNav here="home" email={email} known={known} />
      {piece ? null : (
        <>
          <h1
            style={{
              fontWeight: 500,
              fontSize: 'clamp(1.45rem, 6vw, 1.9rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              margin: '8px 0 0',
            }}
          >
            A chart you can paste.
          </h1>
          <DustRule />
          <p
            style={{
              maxWidth: 540,
              fontSize: 14,
              lineHeight: 1.45,
              color: 'var(--ink)',
              marginTop: 10,
            }}
          >
            Type or speak what to chart, or ask your AI to. Bar, line, or scatter. You get a link and a PNG.
          </p>
        </>
      )}
      <ComposeBox error={error} askPay={askPay} seed={piece ? seedFromPiece(piece) : undefined} />
      {piece ? <Featured piece={piece} /> : null}
      <ExampleList skip={piece?.slug} />
      <SiteFoot />
    </main>
  );
}

function DustRule() {
  return (
    <div className="hero-dust" aria-hidden="true">
      {DUST.map((tone, index) => (
        <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }} />
      ))}
    </div>
  );
}

function Featured({ piece }: { piece: Piece }) {
  return (
    <section style={{ marginTop: 28 }}>
      <p style={kicker}>{piece.kicker}</p>
      <h1 style={chartTitle}>{piece.title}</h1>
      <ChartMount config={piece.config} data={piece.data} label={piece.title} />
      {piece.note ? (
        <p
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            color: 'var(--mute)',
            marginTop: 12,
            maxWidth: 640,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {piece.note}
        </p>
      ) : null}
      {piece.config.source ? <SourceLine source={piece.config.source} /> : null}
      <EmbedActions
        slug={piece.slug}
        title={piece.title}
        note={piece.note}
        source={piece.config.source ? `Source: ${sourceLine(piece.config.source)}` : undefined}
      />
    </section>
  );
}

function ExampleList({ skip }: { skip?: string }) {
  const pieces = PIECES.filter((piece) => piece.slug !== skip);
  if (pieces.length === 0) {
    return null;
  }

  return (
    <>
      <p style={{ ...kicker, marginTop: 28 }}>Examples</p>
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
            <EmbedActions
              slug={piece.slug}
              title={piece.title}
              note={piece.note}
              source={piece.config.source ? `Source: ${sourceLine(piece.config.source)}` : undefined}
            />
          </article>
        ))}
      </div>
    </>
  );
}
