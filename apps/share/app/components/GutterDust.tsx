import { DUST, STUDIO } from '../../lib/theme';

export function GutterDust() {
  return (
    <>
      <div className="gutter-dust gutter-dust-left" aria-hidden="true">
        {DUST.map((tone, index) => (
          <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }} />
        ))}
      </div>
      <div className="gutter-dust gutter-dust-right" aria-hidden="true">
        {DUST.map((tone, index) => (
          <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }} />
        ))}
      </div>
    </>
  );
}
