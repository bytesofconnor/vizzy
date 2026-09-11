import type { ChartSource } from '../../lib/source';
import { sourceLine } from '../../lib/source';

export function SourceLine({ source }: { source: ChartSource }) {
  const text = sourceLine(source);

  return (
    <p
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        color: 'var(--mute)',
        margin: '8px 0 0',
        fontSize: 11,
        letterSpacing: '0.02em',
        lineHeight: 1.45,
      }}
    >
      <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Source</span>
      {'  '}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </p>
  );
}
