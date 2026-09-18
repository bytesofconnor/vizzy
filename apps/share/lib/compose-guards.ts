import { looksSequentialX } from '@vizzy/core';

function countedSeriesRows(notes: string): number {
  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean);
  const table = lines.filter((line) => line.includes('|') && !/^[-|: ]+$/.test(line));
  if (table.length >= 3) {
    return table.filter((line) => /\d/.test(line)).length;
  }
  return lines.filter((line) => /[A-Za-z]/.test(line) && /\d/.test(line)).length;
}

function isCalendarYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1800 && value <= 2100;
}

/** True when lookup notes actually contain a table-like series, not a search snippet. */
export function lookupFoundSeries(notes: string): boolean {
  return countedSeriesRows(notes) >= 4;
}

/**
 * Numbers the user typed to chart — not years, not a NOAA DU series of 1000+.
 * Used to keep pasted y values when the model “improves” them.
 */
export function pastedNumberSeries(asked: string): number[] | undefined {
  const csv = [...asked.matchAll(/^[^\n,]{1,40},\s*(-?\d+(?:\.\d+)?)\s*$/gim)].map((match) =>
    Number(match[1])
  );
  if (csv.length >= 3 && csv.every((value) => !isCalendarYear(value))) {
    return csv;
  }

  const monthYs = [
    ...asked.matchAll(
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(-?\d+(?:\.\d+)?)\b/gi
    ),
  ].map((match) => Number(match[1]));
  if (monthYs.length >= 3) {
    return monthYs;
  }

  const chartThis = asked.match(/chart this:?\s*([0-9.,\s]+)/i);
  if (chartThis?.[1]) {
    const ys = chartThis[1]
      .split(/[,\s]+/)
      .map((part) => Number(part))
      .filter((value) => Number.isFinite(value) && !isCalendarYear(value));
    if (ys.length >= 3) {
      return ys;
    }
  }

  const compact = asked.replace(/\s+/g, ' ');
  const list = compact.match(
    /(?:^|[^\d])((?:-?\d{1,3}(?:\.\d+)?)(?:\s*,\s*-?\d{1,3}(?:\.\d+)?){2,})(?:[^\d.]|$)/
  );
  if (list?.[1]) {
    const ys = list[1]
      .split(/\s*,\s*/)
      .map((part) => Number(part))
      .filter((value) => Number.isFinite(value) && !isCalendarYear(value) && value <= 500);
    if (ys.length >= 3) {
      return ys;
    }
  }

  return undefined;
}

export function applyPastedNumberSeries<T extends { y: number }>(rows: T[], ys: number[]): T[] {
  if (ys.length < 2 || rows.length < ys.length) {
    return rows;
  }
  return rows.map((row, index) => (index < ys.length ? { ...row, y: ys[index]! } : row));
}

export function fitChartType(
  type: 'bar' | 'line' | 'scatter',
  rows: Array<{ x: string | number }>,
  asked: string
): 'bar' | 'line' | 'scatter' {
  if (type === 'scatter' || rows.length < 4) {
    return type;
  }
  const sequential = looksSequentialX(rows.map((row) => String(row.x)));
  const ranking = /\b(rank(?:ed|ing)?|deadliest|top\s*\d+|by lives lost|best fictional)\b/i.test(
    asked
  );
  if (sequential && type === 'bar' && !ranking) {
    return 'line';
  }
  if (!sequential && type === 'line' && ranking) {
    return 'bar';
  }
  return type;
}

/** Expand slang so lookup and draft share a time-or-ranking family. */
export function expandShortPrompt(asked: string): string {
  const compact = asked.replace(/\s+/g, ' ').trim();
  if (compact.length >= 56 || compact.split(/\s+/).length >= 10) {
    return asked;
  }
  const hints = [
    'Treat this as a public chart request.',
    /\b(year|month|since|this year|ytd|working|jobs)\b|\?{2,}/i.test(compact)
      ? 'If x is time, draw a line.'
      : 'If x is named categories, draw a bar.',
    'Never use Country A or Rank 1 as x.',
  ];
  return `${asked}\n\n${hints.join(' ')}`;
}
