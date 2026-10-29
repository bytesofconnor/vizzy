import { DATASETS } from '@vizzy/resolve';
import { describe, expect, it } from 'vitest';
import { decideCompose } from './compose-decision';
import { readComposeOutcome } from './compose-outcome';
import type { ChartSeed } from './seed';

const seed: ChartSeed = {
  title: 'Eggs',
  kicker: 'Test',
  note: 'A chart',
  chartType: 'bar',
  area: false,
  xLabel: 'Kind',
  yLabel: 'Count',
  sourceLabel: 'Example',
  sourceMethod: 'example',
  evidence: 'Test',
  rows: [
    { x: 'A', y: 1 },
    { x: 'B', y: 2 },
  ],
};

function shortLetterAlias(): string | undefined {
  for (const dataset of DATASETS) {
    for (const alias of dataset.aliases) {
      const key = alias.trim().toLowerCase().replace(/\s+/g, ' ');
      if (key.length < 8 && /^\p{L}+$/u.test(key)) {
        return alias.trim();
      }
    }
  }
  return undefined;
}

describe('decideCompose', () => {
  it('asks what eggs should measure, and each option prompt mints', () => {
    const decision = decideCompose({ prompt: 'eggs', disposition: undefined });
    expect(decision.kind).toBe('clarify');
    if (decision.kind !== 'clarify') {
      return;
    }
    expect(decision.ask.options.length).toBeGreaterThanOrEqual(1);
    expect(decision.ask.options.length).toBeLessThanOrEqual(3);
    expect(decision.ask.question).toBe('What should the eggs chart measure?');
    expect(decision.ask.options.map((option) => option.label)).toEqual(['Price', 'By country', 'Over time']);
    expect(decision.ask.options.map((option) => option.prompt)).toEqual([
      'eggs price',
      'eggs by country',
      'eggs over time',
    ]);
    for (const option of decision.ask.options) {
      expect(decideCompose({ prompt: option.prompt, disposition: undefined })).toMatchObject({
        kind: 'mint',
        prompt: option.prompt,
      });
    }
  });

  it('asks which measure for a bare economy question', () => {
    const asked = 'Is the economy doing better?';
    const decision = decideCompose({ prompt: asked, disposition: undefined });
    expect(decision.kind).toBe('clarify');
    if (decision.kind !== 'clarify') {
      return;
    }
    expect(decision.ask.question.toLowerCase()).toContain('which measure');
    expect(decision.ask.question).toBe('Which measure should the chart use?');
    expect(decision.ask.options.map((option) => option.label)).toEqual(['GDP', 'Unemployment', 'Prices']);
    expect(decision.ask.options.map((option) => option.prompt)).toEqual([
      `${asked} GDP`,
      `${asked} unemployment`,
      `${asked} prices`,
    ]);
    const blob = [
      decision.ask.question,
      ...decision.ask.options.flatMap((option) => [option.label, option.prompt]),
    ].join('\n');
    expect(blob).not.toMatch(/sep(?:tember)?\s+2026/i);
    for (const option of decision.ask.options) {
      expect(decideCompose({ prompt: option.prompt, disposition: undefined })).toMatchObject({
        kind: 'mint',
        prompt: option.prompt,
      });
    }
  });

  it('mints a dated bitcoin price prompt', () => {
    const asked = 'Bitcoin price from March to June 2021';
    expect(decideCompose({ prompt: asked, disposition: undefined })).toMatchObject({
      kind: 'mint',
      prompt: asked,
    });
  });

  it('mints unemployment that already names the measure', () => {
    const asked = 'US unemployment since 2019 — is the economy doing better?';
    expect(decideCompose({ prompt: asked, disposition: undefined })).toMatchObject({
      kind: 'mint',
      prompt: asked,
    });
  });

  it('mints eggs when disposition is send', () => {
    expect(decideCompose({ prompt: '  eggs  ', disposition: 'send' })).toMatchObject({
      kind: 'mint',
      prompt: 'eggs',
    });
  });

  it('mints a revise command with the current chart', () => {
    expect(decideCompose({ prompt: 'Make it a line chart.', disposition: undefined, seed })).toMatchObject({
      kind: 'mint',
      prompt: 'Make it a line chart.',
      seed,
    });
  });

  it('does not keep the previous subject when revise names a new topic', () => {
    const decision = decideCompose({
      prompt: 'US unemployment since 2019',
      disposition: undefined,
      seed,
    });
    expect(decision).toMatchObject({
      kind: 'mint',
      prompt: 'US unemployment since 2019',
    });
    expect(decision).not.toHaveProperty('seed');
  });

  it('asks before a vague new topic even when a chart is open', () => {
    const decision = decideCompose({ prompt: 'eggs', disposition: undefined, seed });
    expect(decision.kind).toBe('clarify');
    if (decision.kind !== 'clarify') {
      return;
    }
    expect(decision.ask.question).toBe('What should the eggs chart measure?');
  });

  it('mints a one-word catalog alias shorter than 8 characters', () => {
    const alias = shortLetterAlias();
    expect(alias).toBeTruthy();
    expect(alias!.length).toBeLessThan(8);
    expect(alias!.toLowerCase()).not.toBe('eggs');
    expect(decideCompose({ prompt: alias, disposition: undefined })).toMatchObject({
      kind: 'mint',
      prompt: alias,
    });
    expect(decideCompose({ prompt: `${alias}.`, disposition: undefined })).toMatchObject({
      kind: 'mint',
      prompt: `${alias}.`,
    });
    const aliases = DATASETS.flatMap((dataset) => dataset.aliases).map((item) =>
      item.trim().toLowerCase().replace(/\s+/g, ' ')
    );
    expect(aliases).not.toContain('eggs');
  });

  it('mints when a clarify option would exceed 4000 characters', () => {
    const asked = `${'x'.repeat(3971)} Is the economy doing better?`;
    expect(asked.length).toBe(4000);
    expect(decideCompose({ prompt: asked, disposition: undefined })).toMatchObject({
      kind: 'mint',
      prompt: asked,
    });
  });

  it('rejects a missing, short, long, or bad disposition prompt', () => {
    expect(decideCompose({ prompt: undefined, disposition: undefined })).toEqual({
      kind: 'reject',
      error: 'prompt required',
    });
    expect(decideCompose({ prompt: 'no', disposition: undefined })).toEqual({
      kind: 'reject',
      error: 'Say what to chart',
    });
    expect(decideCompose({ prompt: 'a'.repeat(4001), disposition: undefined })).toEqual({
      kind: 'reject',
      error: 'Keep it under 4000 characters',
    });
    expect(decideCompose({ prompt: 'eggs', disposition: null })).toEqual({
      kind: 'reject',
      error: 'disposition must be ask or send',
    });
    expect(decideCompose({ prompt: 'eggs', disposition: 'later' })).toEqual({
      kind: 'reject',
      error: 'disposition must be ask or send',
    });
  });
});

describe('readComposeOutcome', () => {
  const ask = {
    question: 'What should the eggs chart measure?',
    options: [
      { label: 'Price', prompt: 'eggs price' },
      { label: 'By country', prompt: 'eggs by country' },
      { label: 'Over time', prompt: 'eggs over time' },
    ],
  };

  it('reads a clarify body', () => {
    expect(readComposeOutcome({ clarify: ask })).toEqual({ kind: 'clarify', ask });
  });

  it('reads a minted chart', () => {
    expect(
      readComposeOutcome({
        ok: true,
        url: 'https://vizzy.run/c/bitcoin',
        png: 'https://vizzy.run/c/bitcoin/png',
        token: 'abc',
      })
    ).toEqual({
      kind: 'chart',
      url: 'https://vizzy.run/c/bitcoin',
      png: 'https://vizzy.run/c/bitcoin/png',
      token: 'abc',
    });
  });

  it('fails when url and clarify are both present', () => {
    expect(
      readComposeOutcome({
        ok: true,
        url: 'https://vizzy.run/c/eggs',
        clarify: ask,
      })
    ).toEqual({ kind: 'fail', error: 'Could not generate that chart' });
  });
});
