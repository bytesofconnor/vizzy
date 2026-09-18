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

  it('passes the grid when drafts stay honest', () => {
    const stats = aggregateRun(run);
    expect(stats.n).toBe(96);
    expect(stats.passed).toBe(96);
    expect(stats.brittle).toEqual([]);
  });

  it('does not dress a lookup miss as published', () => {
    const misses = run.cases.filter((row) => row.prompt.situation === 'lookup_miss');
    expect(misses.every((row) => row.pass)).toBe(true);
    expect(misses.every((row) => row.draft.sourceMethod === 'estimate')).toBe(true);
    expect(misses.every((row) => !row.draft.sourceUrl)).toBe(true);
  });
});

describe('recs', () => {
  it('has nothing to recommend once the planted defects are gone', () => {
    const run = cannedRun();
    const recs = recommendFromRun(run, aggregateRun(run));
    expect(recs.map((rec) => rec.id)).toEqual([]);
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
    expect(payload.passed).toBe(96);
    expect(payload.fails).toEqual([]);
    expect(payload.recs).toEqual([]);
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
