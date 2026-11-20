import { yearOfX } from './normalize';
import type { SeriesRow } from './types';

export const MAX_ROWS = 24;

const YEAR_CAP = 60;
const NICE_YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];

export function windowSince(rows: SeriesRow[], sinceYear: number | undefined): SeriesRow[] {
  return windowSpan(rows, sinceYear === undefined ? {} : { since: sinceYear });
}

function monthOfX(value: string | number): number | undefined {
  const match = String(value).trim().match(/^(?:19|20)\d{2}-(\d{2})(?:$|[-/.])/);
  if (!match?.[1]) {
    return undefined;
  }
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : undefined;
}

export function windowSpan(
  rows: SeriesRow[],
  span: { since?: number; until?: number; sinceMonth?: number; untilMonth?: number }
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
    const month = monthOfX(row.x);
    if (
      month !== undefined &&
      span.since !== undefined &&
      span.sinceMonth !== undefined &&
      year === span.since &&
      month < span.sinceMonth
    ) {
      return false;
    }
    if (
      month !== undefined &&
      span.until !== undefined &&
      span.untilMonth !== undefined &&
      year === span.until &&
      month > span.untilMonth
    ) {
      return false;
    }
    return true;
  });
}

const MONTH_STAMP = /^(?:19|20)\d{2}-\d{2}$/;

export function isTimedRows(rows: SeriesRow[]): boolean {
  if (rows.length === 0) {
    return false;
  }
  const timed = rows.filter((row) => {
    const label = String(row.x).trim();
    return yearOfX(label) !== undefined || MONTH_STAMP.test(label);
  }).length;
  return timed >= Math.ceil(rows.length * 0.7);
}

export const CHART_ROW_CAP = 21 * 12;
const MONTHLY_SHARE = 0.7;

export function rowCap(rows: SeriesRow[]): number {
  if (mostlyMonthly(rows)) {
    return CHART_ROW_CAP;
  }
  return MAX_ROWS;
}

function mostlyMonthly(rows: SeriesRow[]): boolean {
  const monthly = rows.filter((row) => MONTH_STAMP.test(String(row.x).trim())).length;
  return monthly >= Math.ceil(rows.length * MONTHLY_SHARE);
}

const MULTI_CAP = 80;

export function downsample(rows: SeriesRow[], max = MAX_ROWS): SeriesRow[] {
  if (rows.some((row) => row.series)) {
    return thinEachSeries(rows);
  }
  if (mostlyMonthly(rows) && rows.length > max) {
    return thinMonthly(rows, max);
  }
  if (isYearly(rows)) {
    return thinYears(rows, Math.max(max, YEAR_CAP));
  }
  return pickEvenly(rows, max);
}

function quarterKey(value: string): string | null {
  const match = value.trim().match(/^((?:19|20)\d{2})-(\d{2})/);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return `${match[1]}-Q${Math.ceil(month / 3)}`;
}

function yearKey(value: string): string | null {
  const match = value.trim().match(/^((?:19|20)\d{2})/);
  return match?.[1] ?? null;
}

function bucketAverage(rows: SeriesRow[], keyOf: (value: string) => string | null): SeriesRow[] {
  const groups = new Map<string, { sum: number; count: number; order: number }>();
  rows.forEach((row, index) => {
    const key = keyOf(String(row.x));
    if (!key || !Number.isFinite(row.y)) {
      return;
    }
    const group = groups.get(key) ?? { sum: 0, count: 0, order: index };
    group.sum += row.y;
    group.count += 1;
    groups.set(key, group);
  });
  return [...groups.entries()]
    .sort((left, right) => left[1].order - right[1].order)
    .map(([x, group]) => ({ x, y: Math.round((group.sum / group.count) * 1000) / 1000 }));
}

function timeOrder(value: string): number {
  const month = value.match(/^((?:19|20)\d{2})-(\d{2})$/);
  if (month?.[1] && month[2]) {
    const parsed = Number(month[2]);
    if (parsed >= 1 && parsed <= 12) {
      return Number(month[1]) * 12 + parsed;
    }
  }
  const quarter = value.match(/^((?:19|20)\d{2})-Q([1-4])$/i);
  if (quarter?.[1] && quarter[2]) {
    return Number(quarter[1]) * 12 + Number(quarter[2]) * 3;
  }
  const named = value.match(/^Q([1-4])\s+((?:19|20)\d{2})$/i);
  if (named?.[1] && named[2]) {
    return Number(named[2]) * 12 + Number(named[1]) * 3;
  }
  const year = value.match(/^((?:19|20)\d{2})$/);
  return year?.[1] ? Number(year[1]) * 12 : Number.MAX_SAFE_INTEGER;
}

function thinMonthly(rows: SeriesRow[], cap: number): SeriesRow[] {
  const quarterly = bucketAverage(rows, quarterKey);
  const averaged = quarterly.length > 0 && quarterly.length <= cap ? quarterly : bucketAverage(rows, yearKey);
  const fitted =
    averaged.length > 0 && averaged.length <= cap ? averaged : pickEvenly(averaged.length > 0 ? averaged : rows, cap);
  return pinRawExtrema(fitted, rows, cap);
}

function pinRawExtrema(sampled: SeriesRow[], original: SeriesRow[], cap: number): SeriesRow[] {
  const finite = original.filter((row) => Number.isFinite(row.y));
  if (finite.length === 0) {
    return sampled;
  }
  let low = finite[0]!;
  let high = finite[0]!;
  for (const row of finite) {
    if (row.y < low.y) {
      low = row;
    }
    if (row.y > high.y) {
      high = row;
    }
  }
  const present = new Set(sampled.map((row) => row.y));
  const extra = [low, high].filter((row, index, list) => {
    if (present.has(row.y)) {
      return false;
    }
    return list.findIndex((item) => item.x === row.x && item.y === row.y) === index;
  });
  if (extra.length === 0) {
    return sampled;
  }
  const room = [...sampled];
  while (room.length + extra.length > cap && room.length > 2) {
    room.splice(Math.floor(room.length / 2), 1);
  }
  return [...room, ...extra].sort(
    (left, right) => timeOrder(String(left.x)) - timeOrder(String(right.x)) || String(left.x).localeCompare(String(right.x))
  );
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
  const lists = [...groups.values()];
  const longest = lists.reduce((best, list) => (list.length > best.length ? list : best), lists[0] ?? []);
  const per = Math.max(2, Math.floor(MULTI_CAP / Math.max(groups.size, 1)));
  const picked = new Set(pickEvenly(longest, per).map((row) => String(row.x)));
  return lists.flatMap((group) => group.filter((row) => picked.has(String(row.x))));
}

function extremeIndexes(rows: SeriesRow[]): number[] {
  let low = -1;
  let high = -1;
  for (let index = 0; index < rows.length; index += 1) {
    const y = rows[index]?.y;
    if (y === undefined || !Number.isFinite(y)) {
      continue;
    }
    if (low < 0 || y < (rows[low]?.y ?? y)) {
      low = index;
    }
    if (high < 0 || y > (rows[high]?.y ?? y)) {
      high = index;
    }
  }
  return [low, high].filter((index, position, list) => index >= 0 && list.indexOf(index) === position);
}

function pickEvenly(rows: SeriesRow[], max: number): SeriesRow[] {
  if (rows.length <= max) {
    return rows;
  }
  if (max < 2) {
    return rows.slice(0, max);
  }
  const must = extremeIndexes(rows).slice(0, max);
  const budget = Math.max(2, max - must.length);
  const chosen = new Set<number>(must);
  const last = budget - 1;
  for (let i = 0; i <= last; i += 1) {
    chosen.add(Math.round((i * (rows.length - 1)) / last));
  }
  const ordered = [...chosen].sort((left, right) => left - right);
  const optional = ordered.filter((index) => !must.includes(index));
  while (ordered.length > max && optional.length > 0) {
    const drop = optional.pop();
    const at = ordered.indexOf(drop ?? -1);
    if (at >= 0) {
      ordered.splice(at, 1);
    }
  }
  return ordered.slice(0, max).map((index) => rows[index]!);
}
