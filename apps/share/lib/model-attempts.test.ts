import { describe, expect, it } from 'vitest';
import { dayWindow, parseModelAttempt, summarizeAttempts } from './model-attempts';
import { modelAttemptCounter } from './track';

describe('model attempt counters', () => {
  it('names a counter the funnel can store', () => {
    const name = modelAttemptCounter({ route: 'compose', model: 'openai/gpt-4.1-mini', outcome: 'schema' });
    expect(name).toBe('model_attempt:compose:schema:openai_gpt-4.1-mini');
    expect(parseModelAttempt(name ?? '')).toEqual({ route: 'compose', outcome: 'schema' });
  });

  it('sums 7-day outcomes by route and skips other days', () => {
    const now = Date.parse('2026-11-18T12:00:00.000Z');
    const { fromDay, toDay } = dayWindow(now, 7);
    const rows = summarizeAttempts(
      [
        { name: 'model_attempt:compose:ok:openai_gpt-4.1-mini', day: toDay, count: 3 },
        { name: 'model_attempt:compose:not_found:groq_llama', day: toDay, count: 2 },
        { name: 'model_attempt:revisions:forbidden:anthropic_claude', day: fromDay, count: 1 },
        { name: 'model_attempt:compose:error:google_gemini', day: '2026-01-01', count: 9 },
        { name: 'visit', day: toDay, count: 4 },
      ],
      fromDay,
      toDay
    );
    expect(rows).toEqual([
      {
        route: 'compose',
        ok: 3,
        failed: 2,
        notFound: 2,
        forbidden: 0,
        rateLimit: 0,
        schema: 0,
        error: 0,
      },
      {
        route: 'revisions',
        ok: 0,
        failed: 1,
        notFound: 0,
        forbidden: 1,
        rateLimit: 0,
        schema: 0,
        error: 0,
      },
    ]);
  });
});
