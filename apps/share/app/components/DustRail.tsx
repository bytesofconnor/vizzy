import { DUST, STUDIO } from '../../lib/theme';

export function DustRail({ className = 'dust-rail' }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {DUST.map((tone, index) => (
        <i
          key={tone}
          style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }}
        />
      ))}
    </div>
  );
}
