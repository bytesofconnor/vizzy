import type { CSSProperties } from 'react';
import Link from 'next/link';
import { PIECES } from '../lib/pieces';
import { ChartMount } from './components/ChartMount';
import { ComposeBox } from './components/ComposeBox';
import { EmbedActions } from './components/EmbedActions';
import { SourceLine } from './components/SourceLine';
import { sourceLine } from '../lib/source';

const kicker: CSSProperties = {
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mute)',
  margin: 0,
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="page-main">
      <p style={kicker}>Vizzy</p>
      <h1
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.7rem, 7vw, 2.15rem)',
          letterSpacing: '-0.02em',
          lineHeight: 1.12,
          margin: '12px 0 0',
        }}
      >
        A chart you can paste.
      </h1>
      <p
        style={{
          maxWidth: 540,
          fontSize: 15,
          lineHeight: 1.5,
          color: 'var(--ink)',
          marginTop: 14,
        }}
      >
        Type what you want, or paste a table. Copy the image.
      </p>
      <ComposeBox error={error} />

      <p style={{ ...kicker, marginTop: 48 }}>Examples</p>
      <div className="piece-list">
        {PIECES.map((piece) => (
          <article key={piece.slug}>
            <Link href={`/c/${piece.slug}`} style={{ textDecoration: 'none' }}>
              <p style={kicker}>{piece.kicker}</p>
              <h2
                style={{
                  fontWeight: 500,
                  fontSize: 'clamp(1.25rem, 5vw, 1.5rem)',
                  letterSpacing: '-0.025em',
                  margin: '6px 0 18px',
                }}
              >
                {piece.title}
              </h2>
            </Link>
            <ChartMount config={piece.config} data={piece.data} />
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
    </main>
  );
}
