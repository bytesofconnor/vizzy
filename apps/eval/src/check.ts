import { compileChart, looksSequentialX } from '@vizzy/core';
import type { EvalDraft, EvalIssue, EvalPrompt } from './types';

const PLACEHOLDER_X =
  /^(country|team|item|player|region|thing)\s*[a-z0-9]$/i;
const RANK_X = /^(rank\s*#?\s*\d+|#\s*\d+)$/i;
const LETTER_AXIS = /^[xy]$/i;

function isUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function rowsFromDraft(draft: EvalDraft): Array<Record<string, unknown>> {
  return draft.rows.map((row) => ({ x: row.x, y: row.y }));
}

export function configFromDraft(draft: EvalDraft) {
  if (draft.chartType === 'line') {
    return {
      schemaVersion: 1 as const,
      chart: {
        type: 'line' as const,
        ...(draft.forecastFrom !== undefined ? { forecastFrom: draft.forecastFrom } : {}),
      },
      dataMapping: { x: 'x', y: 'y' },
      axes: {
        x: { label: draft.xLabel },
        y: { label: draft.yLabel },
      },
    };
  }
  return {
    schemaVersion: 1 as const,
    chart: { type: draft.chartType },
    dataMapping: { x: 'x', y: 'y' },
    axes: {
      x: { label: draft.xLabel },
      y: { label: draft.yLabel },
    },
  };
}

function tooFewForHistory(prompt: EvalPrompt, draft: EvalDraft): boolean {
  if (prompt.style !== 'time' && prompt.situation !== 'in_progress') {
    return false;
  }
  return draft.rows.length < 6;
}

function pastedIgnored(prompt: EvalPrompt, draft: EvalDraft): boolean {
  const expected = prompt.expectedYs;
  if (!expected || expected.length === 0) {
    return false;
  }
  if (draft.rows.length < expected.length) {
    return true;
  }
  return expected.some((value, index) => draft.rows[index]?.y !== value);
}

export function checkDraft(prompt: EvalPrompt, draft: EvalDraft): EvalIssue[] {
  const issues: EvalIssue[] = [];
  const data = rowsFromDraft(draft);
  const compiled = compileChart({ config: configFromDraft(draft), data });
  if (!compiled.valid) {
    issues.push({
      code: 'COMPILE',
      path: compiled.issues[0]?.path ?? 'config',
      message: compiled.issues[0]?.message ?? 'compile failed',
    });
  }

  if (LETTER_AXIS.test(draft.xLabel.trim()) || LETTER_AXIS.test(draft.yLabel.trim())) {
    issues.push({
      code: 'AXIS_LETTER',
      path: 'axes',
      message: 'Axis labels must be words a reader can trust, not x or y',
    });
  }

  for (const row of draft.rows) {
    const name = String(row.x).trim();
    if (PLACEHOLDER_X.test(name) || RANK_X.test(name)) {
      issues.push({
        code: 'PLACEHOLDER_X',
        path: 'rows.x',
        message: `Placeholder or rank index on x: ${name}`,
      });
      break;
    }
  }

  const pretendPublished =
    draft.sourceMethod === 'official' ||
    draft.sourceMethod === 'scraped' ||
    draft.sourceMethod === 'export';
  if (prompt.situation === 'lookup_miss' && pretendPublished) {
    issues.push({
      code: 'LOOKUP_MISS_PRETENDS_PUBLISHED',
      path: 'sourceMethod',
      message: 'Lookup miss must not claim official/scraped/export',
    });
  }
  if (prompt.situation === 'lookup_miss' && isUrl(draft.sourceUrl)) {
    issues.push({
      code: 'INVENTED_URL',
      path: 'sourceUrl',
      message: 'Do not attach a URL when lookup missed and rows are illustrative',
    });
  }
  if (
    prompt.situation === 'lookup_hit' &&
    draft.sourceMethod === 'estimate' &&
    !isUrl(draft.sourceUrl)
  ) {
    issues.push({
      code: 'LOOKUP_HIT_UNSOURCED',
      path: 'sourceMethod',
      message: 'Lookup hit should not be a sourceless estimate',
    });
  }

  const xNames = draft.rows.map((row) => String(row.x));
  const sequential = looksSequentialX(xNames);
  if (prompt.expectedType === 'line' && draft.chartType === 'bar' && sequential) {
    issues.push({
      code: 'TYPE_MISMATCH',
      path: 'chart.type',
      message: 'Time-like x should be a line, not a bar',
    });
  }
  if (prompt.expectedType === 'bar' && draft.chartType === 'line' && !sequential && prompt.style === 'ranking') {
    issues.push({
      code: 'TYPE_MISMATCH',
      path: 'chart.type',
      message: 'Named ranking should be a bar, not a line',
    });
  }

  if (tooFewForHistory(prompt, draft)) {
    issues.push({
      code: 'TOO_FEW_ROWS',
      path: 'rows',
      message: 'History / in-progress series needs more than a handful of points',
    });
  }

  if (pastedIgnored(prompt, draft)) {
    issues.push({
      code: 'PASTED_NUMBERS_IGNORED',
      path: 'rows.y',
      message: 'Pasted numbers were replaced',
    });
  }

  if (prompt.situation === 'in_progress' && draft.forecastFrom === undefined) {
    issues.push({
      code: 'MISSING_FORECAST',
      path: 'chart.forecastFrom',
      message: 'In-progress year must mark the unpublished tail',
    });
  }

  return issues;
}
