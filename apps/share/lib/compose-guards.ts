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

const MIXED_SEX = 'Boys and girls are mixed.';
const RATE_PART = /\b(rates?|percent(?:age)?s?)\b|%/i;
const COUNT_PART = /\b(?:counts?|jobs|payrolls?|births|workers|population|people(?!'))\b/i;
const PART_SPLIT = /\s+(?:and|&|vs\.?|versus)\s+|\s*[,;/]\s*/i;

type EncodingRow = { x: string | number; y: number };

type EncodingResult =
  | { ok: true; rows: EncodingRow[]; yLabel: string; note: string }
  | { ok: false; error: string };

type ColumnRole = 'rank' | 'name' | 'sex' | 'count' | 'boy-name' | 'girl-name' | 'other';

type CountedName = { name: string; count: number; label: string };

export function settleEncoding(input: {
  asked: string;
  notes: string;
  note: string;
  yLabel: string;
  chartType: 'bar' | 'line' | 'scatter';
  rows: EncodingRow[];
}): EncodingResult {
  if (input.chartType !== 'scatter' && axisMixesRateAndCount(input.yLabel, input.rows)) {
    return {
      ok: false,
      error: 'A rate and a count cannot share one axis. Ask for one measure.',
    };
  }

  let rows = input.rows;
  let yLabel = input.yLabel;
  if (encodesRank(yLabel, input.asked, rows)) {
    const counted = countsForRows(input.notes, rows);
    if (!counted) {
      return { ok: false, error: 'Rank is an order, not a bar height. Chart the count.' };
    }
    rows = counted.rows;
    yLabel = counted.yLabel;
  }

  return { ok: true, rows, yLabel, note: withMixedSexNote(input.asked, input.note, rows) };
}

function axisMixesRateAndCount(yLabel: string, rows: Array<{ x: string | number }>): boolean {
  const parts = [yLabel, ...rows.map((row) => String(row.x))].flatMap((text) =>
    text.split(PART_SPLIT).map((part) => part.trim()).filter(Boolean)
  );
  let rate = false;
  let count = false;
  for (const part of parts) {
    const kind = partKind(part);
    if (kind === 'rate') {
      rate = true;
    } else if (kind === 'count') {
      count = true;
    }
  }
  return rate && count;
}

function partKind(part: string): 'rate' | 'count' | 'none' {
  if (RATE_PART.test(part)) {
    return 'rate';
  }
  if (COUNT_PART.test(part)) {
    return 'count';
  }
  return 'none';
}

function encodesRank(yLabel: string, asked: string, rows: EncodingRow[]): boolean {
  if (!isRankLadder(rows)) {
    return false;
  }
  if (/\brank(?:ing|ed|s)?\b/i.test(yLabel)) {
    return true;
  }
  return /\brank(?:ing|ed|s)?\b|\bmost popular\b|\bpopularity\b/i.test(asked);
}

function isRankLadder(rows: EncodingRow[]): boolean {
  if (rows.length < 3) {
    return false;
  }
  const ys = rows.map((row) => row.y);
  if (!ys.every((y) => Number.isInteger(y) && y >= 1 && y <= rows.length)) {
    return false;
  }
  const unique = new Set(ys);
  if (!unique.has(1)) {
    return false;
  }
  const max = Math.max(...ys);
  for (let i = 1; i <= max; i += 1) {
    if (!unique.has(i)) {
      return false;
    }
  }
  return unique.size >= 2;
}

function countsForRows(
  notes: string,
  rows: EncodingRow[]
): { rows: EncodingRow[]; yLabel: string } | null {
  const people = countedNames(notes);
  if (people.length === 0) {
    return null;
  }
  const byName = new Map<string, CountedName[]>();
  for (const person of people) {
    const key = normName(person.name);
    const list = byName.get(key) ?? [];
    list.push(person);
    byName.set(key, list);
  }
  const next: EncodingRow[] = [];
  let label = '';
  for (const row of rows) {
    const matches = byName.get(normName(String(row.x)));
    const person = matches?.length === 1 ? matches[0] : undefined;
    if (!person) {
      return null;
    }
    label = person.label;
    next.push({ x: row.x, y: person.count });
  }
  return label ? { rows: next, yLabel: label } : null;
}

function countedNames(notes: string): CountedName[] {
  const people: CountedName[] = [];
  for (const table of markdownTables(notes)) {
    const header = table[0];
    if (!header) {
      continue;
    }
    const roles = header.map(columnRole);
    const boyName = roles.indexOf('boy-name');
    const girlName = roles.indexOf('girl-name');
    if (boyName >= 0 || girlName >= 0) {
      const boyCount = countColumnAfter(roles, boyName);
      const girlCount = countColumnAfter(roles, girlName);
      for (const cells of table.slice(1)) {
        pushCounted(people, cells, boyName, boyCount, header);
        pushCounted(people, cells, girlName, girlCount, header);
      }
      continue;
    }
    const nameCol = roles.indexOf('name');
    const countCol = roles.indexOf('count');
    if (nameCol < 0 || countCol < 0) {
      continue;
    }
    for (const cells of table.slice(1)) {
      pushCounted(people, cells, nameCol, countCol, header);
    }
  }
  return people;
}

function pushCounted(
  people: CountedName[],
  cells: string[],
  nameCol: number,
  countCol: number,
  header: string[]
): void {
  if (nameCol < 0 || countCol < 0) {
    return;
  }
  const name = cells[nameCol]?.trim() ?? '';
  const count = parseCount(cells[countCol] ?? '');
  if (!name || count === undefined || isRankIndexLabel(name)) {
    return;
  }
  people.push({ name, count, label: header[countCol]?.trim() || 'Count' });
}

function countColumnAfter(roles: ColumnRole[], nameIndex: number): number {
  if (nameIndex < 0) {
    return -1;
  }
  for (let i = nameIndex + 1; i < roles.length; i += 1) {
    const role = roles[i];
    if (role === 'boy-name' || role === 'girl-name' || role === 'name') {
      break;
    }
    if (role === 'count') {
      return i;
    }
  }
  return -1;
}

function columnRole(header: string): ColumnRole {
  const h = header.trim().toLowerCase();
  if (/^(rank|#|ranking)$/.test(h)) {
    return 'rank';
  }
  if (/\b(boys?|males?)\b/.test(h) && /\bnames?\b/.test(h)) {
    return 'boy-name';
  }
  if (/\b(girls?|females?)\b/.test(h) && /\bnames?\b/.test(h)) {
    return 'girl-name';
  }
  if (/^(sex|gender)$/.test(h)) {
    return 'sex';
  }
  if (/^(name|names)$/.test(h)) {
    return 'name';
  }
  if (/^(count|counts|number|births|babies|frequency)$/.test(h)) {
    return 'count';
  }
  if (/\b(births|babies)\b/.test(h) || (/^number of\b/.test(h) && !/\brank\b/.test(h))) {
    return 'count';
  }
  return 'other';
}

function markdownTables(notes: string): string[][][] {
  const tables: string[][][] = [];
  let current: string[][] = [];
  const flush = () => {
    if (current.length >= 2) {
      tables.push(current);
    }
    current = [];
  };
  for (const line of notes.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.includes('|')) {
      if (/^[-|:.\s]+$/.test(trimmed)) {
        continue;
      }
      current.push(
        trimmed
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
      );
    } else if (current.length > 0) {
      flush();
    }
  }
  flush();
  return tables;
}

function parseCount(value: string): number | undefined {
  const n = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : undefined;
}

function normName(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isRankIndexLabel(value: string): boolean {
  return /^(?:#|rank)\s*\d+$/i.test(value.trim());
}

function withMixedSexNote(asked: string, note: string, rows: EncodingRow[]): string {
  if (!unnamedSexMix(asked, rows)) {
    return note;
  }
  if (/boys and girls are mixed/i.test(note)) {
    return note;
  }
  const trimmed = note.trim();
  return trimmed ? `${trimmed} ${MIXED_SEX}` : MIXED_SEX;
}

function unnamedSexMix(asked: string, rows: EncodingRow[]): boolean {
  const labels = rows.map((row) => String(row.x));
  const hasBoy = labels.some((label) => /\b(boys?|males?)\b/i.test(label));
  const hasGirl = labels.some((label) => /\b(girls?|females?)\b/i.test(label));
  if (hasBoy && hasGirl) {
    return false;
  }
  if (!/\bbaby names?\b/i.test(asked)) {
    return false;
  }
  const boys = /\bboys?\b/i.test(asked);
  const girls = /\bgirls?\b/i.test(asked);
  if (boys !== girls) {
    return false;
  }
  return true;
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
