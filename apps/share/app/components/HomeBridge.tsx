import { DUST, STUDIO } from '../../lib/theme';

const STEPS = [
  { label: 'Type a prompt', tone: DUST[0] },
  { label: 'Get a link + PNG', tone: DUST[4] },
  { label: 'Paste anywhere', tone: DUST[6] },
] as const;

export function HomeBridge() {
  return (
    <section className="home-bridge" aria-label="How vizzy works">
      <ul className="home-bridge-steps">
        {STEPS.map((step) => (
          <li key={step.label} className="home-bridge-step">
            <i style={{ background: step.tone === DUST[6] ? STUDIO.ink : step.tone }} aria-hidden="true" />
            {step.label}
          </li>
        ))}
      </ul>
      <div className="home-bridge-dust" aria-hidden="true">
        {DUST.map((tone, index) => (
          <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone }} />
        ))}
      </div>
      <p className="home-bridge-note">Scroll for full example charts you can open or copy.</p>
    </section>
  );
}
