import Link from 'next/link';
import type { Piece } from '../../lib/pieces';
import { sourceLine } from '../../lib/source';
import { ChartMount } from './ChartMount';
import { EmbedActions } from './EmbedActions';
import { SourceLine } from './SourceLine';

export function PieceView({ piece }: { piece: Piece }) {
  return (
    <main className="page-main">
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <Link href="/">Examples</Link>
      </p>
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mute)',
          margin: '32px 0 0',
        }}
      >
        {piece.kicker}
      </p>
      <h1
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.6rem, 7vw, 2.05rem)',
          letterSpacing: '-0.03em',
          margin: '8px 0 20px',
        }}
      >
        {piece.title}
      </h1>
      <ChartMount config={piece.config} data={piece.data} />
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
    </main>
  );
}
