import { describe, expect, it } from 'vitest';
import { parseUsageGroups, statusFlags, usageNeedsAttention, type UsageWindow } from './gateway-usage';

const summary = {
  summary: [
    {
      dimensions: { aiModel: 'google/gemini-2.5-flash' },
      values: { requests: 24, spend: 0.0477743 },
    },
    {
      dimensions: { aiModel: 'openai/gpt-4.1-mini' },
      values: { count: 22, cost: 0.0064128 },
    },
  ],
};

describe('gateway usage parser', () => {
  it('reads spend and request counts from a metrics summary', () => {
    expect(parseUsageGroups(summary, 'aiModel')).toEqual([
      { key: 'google/gemini-2.5-flash', count: 24, costUsd: 0.0477743 },
      { key: 'openai/gpt-4.1-mini', count: 22, costUsd: 0.0064128 },
    ]);
  });

  it('reads the same numbers from a rows payload', () => {
    const groups = parseUsageGroups(
      {
        rows: [
          { dimensions: { httpStatus: '200' }, values: { requests: 61, spend: 0.08 } },
          { dimensions: { httpStatus: '403' }, values: { requests: 7, spend: 0 } },
          { dimensions: { httpStatus: '404' }, values: { requests: 2, spend: 0 } },
        ],
      },
      'httpStatus'
    );
    const flags = statusFlags(groups);
    expect(flags.requestCount).toBe(70);
    expect(flags.forbidden).toBe(7);
    expect(flags.notFound).toBe(2);
    expect(flags.errorRate).toBeCloseTo(9 / 70);
  });

  it('flags an error rate, a 403, or a missing model', () => {
    const quiet: UsageWindow = {
      days: 7,
      byModel: [],
      byStatus: [{ key: '200', count: 4, costUsd: 0 }],
      requestCount: 4,
      costUsd: 0,
      errorRate: 0,
      forbidden: 0,
      notFound: 0,
    };
    expect(usageNeedsAttention(quiet, 0, 0)).toBe(false);
    expect(usageNeedsAttention({ ...quiet, forbidden: 1 }, 0, 0)).toBe(true);
    expect(usageNeedsAttention(quiet, 1, 0)).toBe(true);
  });
});
