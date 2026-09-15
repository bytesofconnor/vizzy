import Link from 'next/link';

const kicker = {
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--mute)',
  margin: 0,
};

export function SiteFoot() {
  return (
    <footer style={{ marginTop: 64 }}>
      <p style={kicker}>
        <Link href="/terms">Terms</Link>
        {' · '}
        <Link href="/agents">Agents</Link>
        {' · '}
        <Link href="/llms.txt">llms.txt</Link>
      </p>
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          color: 'var(--mute)',
          margin: '10px 0 0',
          lineHeight: 1.45,
        }}
      >
        <a href="https://www.bytesofconnor.online/" rel="noreferrer">
          bytesofconnor
        </a>
        {' · '}
        <a href="https://github.com/bytesofconnor" rel="noreferrer">
          GitHub
        </a>
        {' · '}
        <a href="https://x.com/bytesofconnor" rel="noreferrer">
          X
        </a>
      </p>
    </footer>
  );
}
