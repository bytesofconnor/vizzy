import { EVAL_GRID } from './grid';
import { scoreCase } from './score';
import type { EvalCase, EvalDraft, EvalPrompt, EvalRun, SourceMethod } from './types';

export const DEFAULT_MODEL = 'compose-default';
export const CHALLENGER_MODEL = 'compose-challenger';
export const DEFAULT_SEEDS = [1, 2] as const;

function yearRows(count: number, start = 2014): EvalDraft['rows'] {
  return Array.from({ length: count }, (_, i) => ({
    x: start + i,
    y: 20 + i * 0.4,
  }));
}

function namedRows(): EvalDraft['rows'] {
  return [
    { x: 'Japan', y: 42 },
    { x: 'Brazil', y: 31 },
    { x: 'Kenya', y: 22 },
    { x: 'Spain', y: 18 },
    { x: 'Canada', y: 11 },
  ];
}

function pastedRows(prompt: EvalPrompt): EvalDraft['rows'] {
  const ys = prompt.expectedYs ?? [12, 15, 14, 18];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const rows = ys.map((y, i) => ({ x: months[i] ?? `M${i + 1}`, y }));
  if (prompt.style === 'time' && rows.length < 6) {
    return [
      ...rows,
      { x: 'May', y: 16 },
      { x: 'Jun', y: 17 },
    ];
  }
  return rows;
}

function honestDraft(prompt: EvalPrompt): EvalDraft {
  const ranking = prompt.style === 'ranking' || prompt.style === 'overloaded';
  const pasted = prompt.situation === 'pasted_numbers' || prompt.style === 'pasted';
  const rows =
    prompt.situation === 'in_progress'
      ? yearRows(8)
      : pasted
        ? pastedRows(prompt)
        : ranking
          ? namedRows()
          : yearRows(12);

  const lookupHit = prompt.situation === 'lookup_hit';
  const lookupMiss = prompt.situation === 'lookup_miss';
  const sourceMethod: SourceMethod = lookupHit
    ? 'official'
    : lookupMiss
      ? 'estimate'
      : pasted
        ? 'manual'
        : prompt.situation === 'in_progress'
          ? 'official'
          : 'unknown';

  return {
    title: prompt.prompt.slice(0, 80),
    chartType: prompt.expectedType,
    xLabel: ranking && !pasted ? 'Name' : 'Year',
    yLabel: 'Value',
    sourceLabel: lookupMiss ? 'Topic search — no published table' : 'Publisher series',
    sourceMethod,
    sourceUrl: lookupHit ? 'https://example.gov/series' : undefined,
    evidence: lookupMiss ? 'lookup failed; rows illustrative' : 'series from notes',
    forecastFrom: prompt.situation === 'in_progress' ? rows[4]?.x : undefined,
    rows,
  };
}

/**
 * Honest drafts for every cell. Production compose is scored against this shape;
 * do not plant defects here — check.ts already covers the failure modes.
 */
export function draftFor(prompt: EvalPrompt, _model: string, _seed: number): EvalDraft {
  return honestDraft(prompt);
}

export function cannedRun(args?: { models?: string[]; seeds?: readonly number[] }): EvalRun {
  const models = args?.models ?? [DEFAULT_MODEL, CHALLENGER_MODEL];
  const seeds = args?.seeds ?? DEFAULT_SEEDS;
  const cases: EvalCase[] = [];
  for (const prompt of EVAL_GRID) {
    for (const model of models) {
      for (const seed of seeds) {
        cases.push(scoreCase(prompt, draftFor(prompt, model, seed), model, seed));
      }
    }
  }
  return {
    id: 'canned-v2',
    at: '2026-09-16T00:00:00.000Z',
    kind: 'canned',
    models,
    repeats: seeds.length,
    cases,
  };
}
