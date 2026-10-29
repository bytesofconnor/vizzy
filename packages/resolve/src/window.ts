import { yearOfX } from './normalize';
import type { SeriesRow } from './types';

export const MAX_ROWS = 24;

const YEAR_CAP = 60;
const NICE_YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];

export function windowSince(rows: SeriesRow[], sinceYear: number | undefined): SeriesRow[] {
  return windowSpan(rows, sinceYear === undefined ? {} : { since: sinceYear });
}

export function windowSpan(
  rows: SeriesRow[],
  span: { since?: number; until?: number }
): SeriesRow[] {
  if (span.since === undefined && span.until === undefined) {
    return rows;
  }
  return rows.filter((row) => {
    const year = yearOfX(row.x);
    if (year === undefined) {
      return true;
    }
    if (span.since !== undefined && year < span.since) {
      return false;
    }
    if (span.until !== undefined && year > span.until) {
      return false;
    }
    return true;
  });
}

const MONTH_STAMP = /^(?:19|20)\d{2}-\d{2}$/;
const MONTHLY_KEEP = 80;

/** A few years of months stay monthly. A longer history still thins to MAX_ROWS. */
export function rowCap(rows: SeriesRow[]): number {
  if (rows.length <= MAX_ROWS) {
    return MAX_ROWS;
  }
  const monthly = rows.filter((row) => MONTH_STAMP.test(String(row.x).trim())).length;
  if (monthly < Math.ceil(rows.length * 0.7) || rows.length > MONTHLY_KEEP) {
    return MAX_ROWS;
  }
  return rows.length;
}

const MULTI_CAP = 80;

export function downsample(rows: SeriesRow[], max = MAX_ROWS): SeriesRow[] {
  if (rows.some((row) => row.series)) {
    return thinEachSeries(rows);
  }
  if (isYearly(rows)) {
    return thinYears(rows, Math.max(max, YEAR_CAP));
  }
  return pickEvenly(rows, max);
}

function isYearly(rows: SeriesRow[]): boolean {
  if (rows.length < 4) {
    return false;
  }
  const years = rows.map((row) => yearOfX(row.x));
  const present = years.filter((year): year is number => year !== undefined && year >= 1000 && year <= 2100);
  if (present.length < Math.ceil(rows.length * 0.7)) {
    return false;
  }
  return new Set(present).size >= present.length * 0.7;
}

function thinYears(rows: SeriesRow[], cap: number): SeriesRow[] {
  if (rows.length <= cap) {
    return rows;
  }
  const ordered = rows
    .map((row, index) => ({ row, index, year: yearOfX(row.x) }))
    .filter((item): item is { row: SeriesRow; index: number; year: number } => item.year !== undefined)
    .sort((a, b) => a.year - b.year || a.index - b.index);
  const last = ordered[ordered.length - 1]?.year;
  if (last === undefined) {
    return pickEvenly(rows, Math.min(cap, MAX_ROWS));
  }
  for (const step of NICE_YEAR_STEPS) {
    const kept = ordered.filter((item) => item.year % step === 0 || item.year === last);
    if (kept.length < 2 || kept.length > cap) {
      continue;
    }
    const gaps = kept.slice(1).map((item, index) => item.year - (kept[index]?.year ?? item.year));
    const interior = last % step === 0 ? gaps : gaps.slice(0, -1);
    if (interior.length > 0 && interior.every((gap) => gap === step)) {
      return kept.map((item) => item.row);
    }
  }
  return pickEvenly(rows, Math.min(cap, MAX_ROWS));
}

function thinEachSeries(rows: SeriesRow[]): SeriesRow[] {
  if (rows.length <= MULTI_CAP) {
    return rows;
  }
  const groups = new Map<string, SeriesRow[]>();
  for (const row of rows) {
    const key = row.series ?? '';
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const per = Math.max(2, Math.floor(MULTI_CAP / Math.max(groups.size, 1)));
  return [...groups.values()].flatMap((group) => pickEvenly(group, per));
}

function pickEvenly(rows: SeriesRow[], max: number): SeriesRow[] {
  if (rows.length <= max) {
    return rows;
  }
  if (max < 2) {
    return rows.slice(0, max);
  }
  const last = max - 1;
  const out: SeriesRow[] = [];
  const seen = new Set<number>();
  for (let i = 0; i <= last; i += 1) {
    const index = Math.round((i * (rows.length - 1)) / last);
    if (seen.has(index)) {
      continue;
    }
    seen.add(index);
    const row = rows[index];
    if (row) {
      out.push(row);
    }
  }
  return out;
}
