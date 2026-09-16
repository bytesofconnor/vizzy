'use client';

import { useMemo, type CSSProperties } from 'react';
import { PROMPT_IDEAS, type PromptIdea } from '../../lib/prompt-ideas';

const ROW_COUNT = 3;

const ROW_CONFIGS = [
  { duration: 92, direction: 'left' as const, delay: -18 },
  { duration: 118, direction: 'right' as const, delay: -41 },
  { duration: 84, direction: 'left' as const, delay: -9 },
];

function ideasForRow(row: number): PromptIdea[] {
  return PROMPT_IDEAS.filter((_, index) => index % ROW_COUNT === row);
}

export function HeroExamples({ onPick }: { onPick: (prompt: string) => void }) {
  const rows = useMemo(
    () =>
      ROW_CONFIGS.map((config, index) => ({
        ...config,
        ideas: ideasForRow(index),
      })),
    []
  );

  if (PROMPT_IDEAS.length === 0) {
    return null;
  }

  return (
    <div className="hero-examples" aria-label="Example questions">
      <p className="hero-examples-kicker">More questions</p>
      <div className="hero-marquee-stack">
        {rows.map((row, index) =>
          row.ideas.length > 0 ? (
            <MarqueeRow
              key={index}
              ideas={row.ideas}
              direction={row.direction}
              duration={row.duration}
              delay={row.delay}
              onPick={onPick}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function MarqueeRow({
  ideas,
  direction,
  duration,
  delay,
  onPick,
}: {
  ideas: PromptIdea[];
  direction: 'left' | 'right';
  duration: number;
  delay: number;
  onPick: (prompt: string) => void;
}) {
  const loop = [...ideas, ...ideas];

  return (
    <div className="hero-marquee">
      <div
        className={['hero-marquee-track', direction === 'right' ? 'is-reverse' : ''].filter(Boolean).join(' ')}
        style={
          {
            '--marquee-duration': `${duration}s`,
            '--marquee-delay': `${delay}s`,
          } as CSSProperties
        }
      >
        {loop.map((idea, index) => (
          <button
            key={`${idea.id}-${index}`}
            type="button"
            className="hero-marquee-chip"
            title={idea.prompt}
            style={{ '--chip-tone': idea.tone } as CSSProperties}
            onClick={() => onPick(idea.prompt)}
          >
            <i aria-hidden="true" />
            <span>{idea.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
