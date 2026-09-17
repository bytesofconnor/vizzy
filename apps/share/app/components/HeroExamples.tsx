'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DEFAULT_HERO_IDEAS,
  HERO_IDEAS_STORAGE_KEY,
  isHeroIdeaBatch,
  parseHeroIdeas,
  type HeroIdea,
} from '../../lib/hero-ideas';
import { DustRail } from './DustRail';

export function HeroExamples({
  onPick,
  disabled = false,
}: {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const [ideas, setIdeas] = useState<HeroIdea[]>(DEFAULT_HERO_IDEAS);
  const [busy, setBusy] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [wave, setWave] = useState(0);
  const arriveTimer = useRef<ReturnType<typeof setTimeout> | 0>(0);

  const persist = useCallback((next: HeroIdea[]) => {
    setIdeas(next);
    try {
      window.localStorage.setItem(HERO_IDEAS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode
    }
  }, []);

  const fetchIdeas = useCallback(async (exclude: string[], reshuffle: boolean) => {
    const response = await fetch('/api/prompt-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exclude,
        salt: `${Date.now()}-${reshuffle ? 'more' : 'boot'}`,
        reshuffle,
      }),
    });
    const body: unknown = await response.json();
    const next =
      typeof body === 'object' && body !== null && 'ideas' in body
        ? parseHeroIdeas((body as { ideas: unknown }).ideas)
        : [];
    return isHeroIdeaBatch(next) ? next : [];
  }, []);

  const loadIdeas = useCallback(
    async (exclude: string[], reshuffle: boolean) => {
      setBusy(true);
      window.clearTimeout(arriveTimer.current);
      try {
        const next = await fetchIdeas(exclude, reshuffle);
        if (next.length > 0) {
          persist(next);
          setWave((value) => value + 1);
          const reduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reshuffle && !reduced) {
            setArriving(true);
            arriveTimer.current = window.setTimeout(() => setArriving(false), 640);
          } else {
            setArriving(false);
          }
        }
      } catch {
        // keep current ideas
      }
      setBusy(false);
    },
    [fetchIdeas, persist]
  );

  useEffect(() => {
    return () => window.clearTimeout(arriveTimer.current);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HERO_IDEAS_STORAGE_KEY);
      if (raw) {
        const stored = parseHeroIdeas(JSON.parse(raw) as unknown);
        if (isHeroIdeaBatch(stored)) {
          setIdeas(stored);
          return;
        }
      }
    } catch {
      // first visit
    }
    void loadIdeas([], false);
  }, [loadIdeas]);

  const exclude = ideas.flatMap((idea) => [idea.prompt, idea.label]);
  const rows = splitRows(ideas);

  return (
    <div
      className={['hero-examples', 'hero-ticker', arriving ? 'is-arriving' : '', busy ? 'is-busy' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Example questions"
    >
      {rows.map((row, rowIndex) => (
        <div className="hero-ticker-row" key={`row-${rowIndex}`}>
          <div
            className={rowIndex % 2 === 1 ? 'hero-ticker-track is-reverse' : 'hero-ticker-track'}
            style={
              {
                '--marquee-duration': `${rowIndex % 2 === 1 ? 38 : 28}s`,
              } as CSSProperties
            }
          >
            {[0, 1].map((copy) =>
              row.map((idea, index) => (
                <button
                  key={`${wave}-${copy}-${idea.id}`}
                  type="button"
                  className="hero-ticker-item"
                  title={idea.prompt}
                  style={{ '--chip-tone': idea.tone, '--chip-i': String(index) } as CSSProperties}
                  disabled={disabled || busy}
                  onClick={() => onPick(idea.prompt)}
                >
                  <i aria-hidden="true" />
                  <span>{idea.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="hero-ticker-shuffle"
        disabled={disabled || busy}
        aria-busy={busy}
        onClick={() => void loadIdeas(exclude, true)}
      >
        <DustRail className="hero-ticker-shuffle-rail dust-rail" />
        {busy ? 'Shuffling…' : 'Shuffle'}
      </button>
    </div>
  );
}

function splitRows(ideas: HeroIdea[]): HeroIdea[][] {
  if (ideas.length <= 4) {
    return [ideas];
  }
  const mid = Math.ceil(ideas.length / 2);
  return [ideas.slice(0, mid), ideas.slice(mid)];
}
