import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HERO_IDEAS,
  HERO_IDEA_MIN,
  asChipLabel,
  fallbackHeroIdeas,
  isHeroIdeaBatch,
  mergeSeenPrompts,
  parseHeroIdeas,
} from './hero-ideas';

const sample = (label: string, prompt: string) => ({ label, prompt });

describe('asChipLabel', () => {
  it('forces sentence case and keeps CDs', () => {
    expect(asChipLabel('When Vinyl Beat CDs Again')).toBe('When vinyl beat CDs again');
  });

  it('rejects topic stubs', () => {
    expect(asChipLabel('Ozone hole')).toBe('');
    expect(asChipLabel('Earthquakes')).toBe('');
  });
});

describe('parseHeroIdeas', () => {
  it('keeps up to ten clean chips', () => {
    const ideas = parseHeroIdeas([
      sample('When the Fed funds rate spiked', 'U.S. federal funds rate since 2000 — when did the hiking cycles spike?'),
      sample('Did Montreal actually heal ozone', 'Antarctic ozone hole peak area by year — can you see Montreal working?'),
      sample('Who gained the most years alive', 'Life expectancy at birth by country since 2000 — who gained the most years?'),
      sample('Where the biggest quakes cluster', 'Strongest earthquakes since 2000 by magnitude — are they clustering in fewer regions?'),
      sample('Who actually owns Eurovision now', 'Eurovision wins by country — is Ireland still the record holder after all these years?'),
      sample('Where Mauna Loa CO₂ finally bends', 'Atmospheric CO₂ at Mauna Loa by decade — where does the curve bend after Paris?'),
      sample('The year the 100m stopped falling', "Men's Olympic 100m winning times since 1968 — how much did the record actually fall?"),
      sample('When vinyl beat CDs again', 'When did US vinyl sales overtake CDs again — and how fast did the crossover happen?'),
      sample('When Arctic sea ice fell off', 'Arctic sea ice September minimum since 1979 — when did the collapse steepen?'),
    ]);
    expect(ideas).toHaveLength(9);
    expect(isHeroIdeaBatch(ideas)).toBe(true);
    expect(ideas[0]?.label).toBe('When the Fed funds rate spiked');
  });

  it('drops short or duplicate prompts', () => {
    const ideas = parseHeroIdeas([
      { label: 'A', prompt: 'too short' },
      {
        label: 'When the Fed funds rate spiked',
        prompt: 'U.S. federal funds rate since 2000 — when did the hiking cycles spike?',
      },
      {
        label: 'When the Fed funds rate jumped',
        prompt: 'U.S. federal funds rate since 2000 — when did the hiking cycles spike?',
      },
    ]);
    expect(ideas).toHaveLength(1);
    expect(isHeroIdeaBatch(ideas)).toBe(false);
  });
});

describe('fallbackHeroIdeas', () => {
  it('returns a full default batch', () => {
    expect(DEFAULT_HERO_IDEAS.length).toBeGreaterThanOrEqual(HERO_IDEA_MIN);
    expect(isHeroIdeaBatch(fallbackHeroIdeas([], 'seed'))).toBe(true);
  });

  it('stays in geopolitics, economics, and technology', () => {
    const prompts = fallbackHeroIdeas([], 'mix').map((idea) => idea.prompt.toLowerCase());
    expect(prompts.some((line) => /museum|box office|eurovision|spotify|vinyl|auction/.test(line))).toBe(
      false
    );
  });

  it('changes when the salt changes', () => {
    const a = fallbackHeroIdeas([], 'alpha').map((idea) => idea.prompt);
    const b = fallbackHeroIdeas([], 'omega').map((idea) => idea.prompt);
    expect(a).not.toEqual(b);
  });

  it('skips prompts already shown', () => {
    const first = fallbackHeroIdeas([], 'one');
    const next = fallbackHeroIdeas(
      first.map((idea) => idea.prompt),
      'two'
    );
    const overlap = next.filter((idea) => first.some((item) => item.prompt === idea.prompt));
    expect(overlap).toHaveLength(0);
  });

  it('defaults to a weirder mix than Fed and fertility', () => {
    const text = DEFAULT_HERO_IDEAS.map((idea) => `${idea.label} ${idea.prompt}`.toLowerCase()).join(' ');
    expect(text).toMatch(/sea ice|lithium|launch|dollar|wildfire|lng|robot/);
    expect(text).not.toMatch(/federal funds|fertility rate|unemployment/);
    expect(DEFAULT_HERO_IDEAS.every((idea) => idea.label.length >= 12)).toBe(true);
  });
});

describe('mergeSeenPrompts', () => {
  it('keeps a rolling memory of labels and prompts', () => {
    const first = fallbackHeroIdeas([], 'alpha');
    const seen = mergeSeenPrompts([], first);
    expect(seen.length).toBeGreaterThanOrEqual(first.length);
    const again = mergeSeenPrompts(seen, first);
    expect(again.length).toBe(seen.length);
  });
});
