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
  const xs = ['Jan', 'Feb', 'Mar', 'Apr'];
  return ys.map((y, i) => ({ x: xs[i] ?? `M${i + 1}`, y }));
}

function honestDraft(prompt: EvalPrompt): EvalDraft {
  const ranking = prompt.style === 'ranking' || prompt.style === 'overloaded';
  const pasted = prompt.situation === 'pasted_numbers' || prompt.style === 'pasted';
  const rows = pasted
    ? pastedRows(prompt)
    : ranking && prompt.situation !== 'in_progress'
      ? namedRows()
      : yearRows(prompt.situation === 'in_progress' ? 8 : 12);

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
 * Known defects so the canned batch has real variance:
 * - short + lookup_miss + seed 2: placeholders (brittle vs seed 1)
 * - challenger + lookup_miss: invented URL + pretends published
 * - time + lookup_hit + seed 2 + default: bar instead of line
 * - pasted_numbers + seed 2 + default: wrong y values
 */
export function draftFor(prompt: EvalPrompt, model: string, seed: number): EvalDraft {
  let draft = honestDraft(prompt);

  if (model === CHALLENGER_MODEL && prompt.situation === 'lookup_miss') {
    draft = {
      ...draft,
      sourceMethod: 'official',
      sourceUrl: 'https://example.invalid/made-up',
      evidence: 'found it',
    };
  }

  if (prompt.style === 'short' && prompt.situation === 'lookup_miss' && seed === 2) {
    draft = {
      ...draft,
      rows: [
        { x: 'Country A', y: 10 },
        { x: 'Country B', y: 9 },
        { x: 'Country C', y: 8 },
        { x: 'Country D', y: 7 },
        { x: 'Country E', y: 6 },
      ],
    };
  }

  if (
    model === DEFAULT_MODEL &&
    seed === 2 &&
    prompt.style === 'time' &&
    prompt.situation === 'lookup_hit'
  ) {
    draft = { ...draft, chartType: 'bar' };
  }

  if (model === DEFAULT_MODEL && seed === 2 && prompt.situation === 'pasted_numbers') {
    draft = {
      ...draft,
      rows: draft.rows.map((row, i) => ({ ...row, y: 100 + i })),
    };
  }

  return draft;
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
    id: 'canned-v1',
    at: '2026-09-16T00:00:00.000Z',
    kind: 'canned',
    models,
    repeats: seeds.length,
    cases,
  };
}
