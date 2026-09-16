import { describe, expect, it } from 'vitest';
import { checkDraft } from './check';
import { EVAL_GRID, evalGrid } from './grid';
import { DATA_SITUATIONS, PROMPT_STYLES } from './types';
import type { EvalDraft, EvalPrompt } from './types';

function base(prompt: EvalPrompt, over: Partial<EvalDraft> = {}): EvalDraft {
  return {
    title: 'Test',
    chartType: prompt.expectedType,
    xLabel: 'Year',
    yLabel: 'Value',
    sourceLabel: 'Notes',
    sourceMethod: prompt.situation === 'lookup_hit' ? 'official' : 'estimate',
    sourceUrl: prompt.situation === 'lookup_hit' ? 'https://example.gov/x' : undefined,
    evidence: prompt.situation === 'lookup_miss' ? 'lookup failed' : 'notes',
    forecastFrom: prompt.situation === 'in_progress' ? 2024 : undefined,
    rows:
      prompt.expectedYs?.map((y, i) => ({ x: 2018 + i, y })) ??
      [
        { x: 2018, y: 1 },
        { x: 2019, y: 2 },
        { x: 2020, y: 3 },
        { x: 2021, y: 4 },
        { x: 2022, y: 5 },
        { x: 2023, y: 6 },
        { x: 2024, y: 7 },
        { x: 2025, y: 8 },
      ],
    ...over,
  };
}

const timeHit = EVAL_GRID.find((cell) => cell.id === 'time__lookup_hit')!;
const miss = EVAL_GRID.find((cell) => cell.id === 'short__lookup_miss')!;
const pasted = EVAL_GRID.find((cell) => cell.id === 'time__pasted_numbers')!;
const progress = EVAL_GRID.find((cell) => cell.id === 'time__in_progress')!;
const rank = EVAL_GRID.find((cell) => cell.id === 'ranking__lookup_hit')!;

describe('eval grid', () => {
  it('is 6 styles × 4 situations', () => {
    expect(PROMPT_STYLES).toHaveLength(6);
    expect(DATA_SITUATIONS).toHaveLength(4);
    expect(evalGrid()).toHaveLength(24);
    expect(new Set(EVAL_GRID.map((cell) => cell.id)).size).toBe(24);
  });
});

describe('checkDraft', () => {
  it('passes an honest time series with a real source', () => {
    expect(checkDraft(timeHit, base(timeHit))).toEqual([]);
  });

  it('fails letter axis labels', () => {
    const issues = checkDraft(timeHit, base(timeHit, { xLabel: 'x', yLabel: 'y' }));
    expect(issues.some((issue) => issue.code === 'AXIS_LETTER')).toBe(true);
  });

  it('fails Country A placeholders', () => {
    const issues = checkDraft(
      miss,
      base(miss, {
        rows: [
          { x: 'Country A', y: 1 },
          { x: 'Country B', y: 2 },
        ],
      })
    );
    expect(issues.some((issue) => issue.code === 'PLACEHOLDER_X')).toBe(true);
  });

  it('fails Rank 1 x labels but not years', () => {
    const ranked = checkDraft(
      rank,
      base(rank, {
        chartType: 'bar',
        rows: [
          { x: 'Rank 1', y: 1 },
          { x: 'Rank 2', y: 2 },
        ],
      })
    );
    expect(ranked.some((issue) => issue.code === 'PLACEHOLDER_X')).toBe(true);
    expect(checkDraft(timeHit, base(timeHit)).some((issue) => issue.code === 'PLACEHOLDER_X')).toBe(
      false
    );
  });

  it('fails invented URL on lookup miss', () => {
    const issues = checkDraft(
      miss,
      base(miss, { sourceUrl: 'https://example.com/nope', sourceMethod: 'estimate' })
    );
    expect(issues.some((issue) => issue.code === 'INVENTED_URL')).toBe(true);
  });

  it('fails lookup miss claiming official', () => {
    const issues = checkDraft(miss, base(miss, { sourceMethod: 'official', sourceUrl: undefined }));
    expect(issues.some((issue) => issue.code === 'LOOKUP_MISS_PRETENDS_PUBLISHED')).toBe(true);
  });

  it('fails bar on sequential years when the cell expects a line', () => {
    const issues = checkDraft(timeHit, base(timeHit, { chartType: 'bar' }));
    expect(issues.some((issue) => issue.code === 'TYPE_MISMATCH')).toBe(true);
  });

  it('fails a ranking drawn as a line', () => {
    const issues = checkDraft(
      rank,
      base(rank, {
        chartType: 'line',
        rows: [
          { x: 'Krakatoa', y: 1 },
          { x: 'Tambora', y: 2 },
          { x: 'Unzen', y: 3 },
          { x: 'Pelee', y: 4 },
          { x: 'Ruiz', y: 5 },
          { x: 'Pinatubo', y: 6 },
        ],
      })
    );
    expect(issues.some((issue) => issue.code === 'TYPE_MISMATCH')).toBe(true);
  });

  it('fails too few rows on a history prompt', () => {
    const issues = checkDraft(
      timeHit,
      base(timeHit, {
        rows: [
          { x: 2018, y: 1 },
          { x: 2019, y: 2 },
        ],
      })
    );
    expect(issues.some((issue) => issue.code === 'TOO_FEW_ROWS')).toBe(true);
  });

  it('fails when pasted y values change', () => {
    const issues = checkDraft(
      pasted,
      base(pasted, {
        rows: pasted.expectedYs!.map((y, i) => ({ x: 2018 + i, y: y + 1 })),
      })
    );
    expect(issues.some((issue) => issue.code === 'PASTED_NUMBERS_IGNORED')).toBe(true);
  });

  it('fails in-progress without forecastFrom', () => {
    const issues = checkDraft(progress, base(progress, { forecastFrom: undefined }));
    expect(issues.some((issue) => issue.code === 'MISSING_FORECAST')).toBe(true);
  });
});
