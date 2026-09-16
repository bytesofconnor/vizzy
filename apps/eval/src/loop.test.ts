import { describe, expect, it } from 'vitest';
import { aggregateRun } from './aggregate';
import { cannedRun, CHALLENGER_MODEL, DEFAULT_MODEL, draftFor } from './canned';
import { runComposeBatch } from './compose';
import { EVAL_GRID } from './grid';
import { payloadFromRun } from './payload';
import { recommendFromRun } from './recommend';
import { formatReportText, reportFromRun } from './report';

describe('canned batch', () => {
  const run = cannedRun();

  it('covers 24 prompts × 2 models × 2 seeds', () => {
    expect(EVAL_GRID).toHaveLength(24);
    expect(run.cases).toHaveLength(96);
    expect(run.models).toEqual([DEFAULT_MODEL, CHALLENGER_MODEL]);
    expect(run.repeats).toBe(2);
  });

  it('is not a perfect score — the planted defects exist', () => {
    const stats = aggregateRun(run);
    expect(stats.n).toBe(96);
    expect(stats.passed).toBeLessThan(stats.n);
    expect(stats.passed).toBeGreaterThan(50);
    expect(stats.brittle.length).toBeGreaterThan(0);
  });

  it('marks short lookup_miss as brittle on the default model', () => {
    const pair = run.cases.filter(
      (row) => row.promptId === 'short__lookup_miss' && row.model === DEFAULT_MODEL
    );
    expect(pair.map((row) => row.pass).sort()).toEqual([false, true]);
  });

  it('fails the challenger on every lookup_miss (invented published source)', () => {
    const misses = run.cases.filter(
      (row) => row.model === CHALLENGER_MODEL && row.prompt.situation === 'lookup_miss'
    );
    expect(misses.length).toBe(12);
    expect(misses.every((row) => !row.pass)).toBe(true);
    expect(
      misses.every((row) =>
        row.issues.some(
          (issue) => issue.code === 'INVENTED_URL' || issue.code === 'LOOKUP_MISS_PRETENDS_PUBLISHED'
        )
      )
    ).toBe(true);
  });
});

describe('recs', () => {
  it('emits actionable drafts from the canned aggregates', () => {
    const run = cannedRun();
    const recs = recommendFromRun(run, aggregateRun(run));
    const ids = recs.map((rec) => rec.id);
    expect(ids).toContain('placeholders');
    expect(ids).toContain('honest-miss');
    expect(ids).toContain('pasted-table');
    expect(ids).toContain('type-fit');
    expect(ids).toContain('brittle-repeats');
    expect(ids).toContain('model-gap');
    expect(new Set(ids).size).toBe(ids.length);
    expect(recs.every((rec) => rec.suggestedChange.length > 20)).toBe(true);
  });
});

describe('report', () => {
  it('formats a briefing a human can read', () => {
    const text = formatReportText(reportFromRun(cannedRun()));
    expect(text).toContain('canned');
    expect(text).toContain('By style');
    expect(text).toContain('Recommendations');
    expect(text).toContain('do not auto-merge');
  });
});

describe('payload', () => {
  it('is a bounded Convex document, not 96 full drafts', () => {
    const payload = payloadFromRun(cannedRun());
    expect(payload.n).toBe(96);
    expect(payload.fails.length).toBeGreaterThan(0);
    expect(payload.fails.length).toBeLessThanOrEqual(40);
    expect(payload.recs.length).toBeGreaterThan(0);
    expect(payload.fails[0]?.issues.length).toBeGreaterThan(0);
  });
});

describe('compose batch', () => {
  it('scores an injected mapper — no network', async () => {
    const prompts = EVAL_GRID.slice(0, 1);
    const cases = await runComposeBatch({
      prompts,
      models: [DEFAULT_MODEL],
      seeds: [1],
      compose: async (prompt, model, seed) => draftFor(prompt, model, seed),
    });
    expect(cases).toHaveLength(1);
    expect(cases[0]?.promptId).toBe(prompts[0]?.id);
    expect(cases[0]?.pass).toBe(true);
  });
});

describe('close loop', () => {
  it('drops recs that the next snapshot no longer emits', async () => {
    const { recsDropped } = await import('./close');
    expect(recsDropped(['placeholders', 'honest-miss'], ['honest-miss', 'pasted-table'])).toEqual([
      'placeholders',
    ]);
  });
});
