import Link from 'next/link';
import { EventLink } from './EventLink';

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
    <footer className="site-foot" style={{ marginTop: 64 }}>
      <p style={kicker}>
        <EventLink href="/terms" name="tap_terms">
          Terms
        </EventLink>
        {' · '}
        <EventLink href="/for/writers" name="tap_writers">
          Writers
        </EventLink>
        {' · '}
        <EventLink href="/agents" name="tap_agents">
          Agents
        </EventLink>
        {' · '}
        <EventLink href="/llms.txt" name="tap_llms">
          llms.txt
        </EventLink>
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
