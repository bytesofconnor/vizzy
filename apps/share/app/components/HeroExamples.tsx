'use client';

import type { CSSProperties } from 'react';
import { PROMPT_IDEAS } from '../../lib/prompt-ideas';

const HERO_PICKS = [
  { id: 'vinyl', label: 'Vinyl vs CDs' },
  { id: 'tigers', label: 'Wild tigers' },
  { id: 'ozone', label: 'Ozone hole' },
] as const;

export function HeroExamples({ onPick }: { onPick: (prompt: string) => void }) {
  const ideas = HERO_PICKS.map((pick) => {
    const idea = PROMPT_IDEAS.find((entry) => entry.id === pick.id);
    return idea ? { ...idea, label: pick.label } : null;
  }).filter((idea): idea is NonNullable<typeof idea> => idea !== null);

  if (ideas.length === 0) {
    return null;
  }

  return (
    <div className="hero-examples is-compact" aria-label="Example questions">
      <div className="hero-examples-grid">
        {ideas.map((idea) => (
          <button
            key={idea.id}
            type="button"
            className="hero-example-chip"
            title={idea.prompt}
            style={{ '--chip-tone': idea.tone } as CSSProperties}
            onClick={() => onPick(idea.prompt)}
          >
            <i aria-hidden="true" />
            <span>{idea.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
