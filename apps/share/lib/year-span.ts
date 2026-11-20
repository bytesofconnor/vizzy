import { yearSpanFromAsked } from '@vizzy/resolve';

export type YearSpan = { first: number; last: number };

export type TimeStamp = { year: number; month?: number; quarter?: number };

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function timeStamp(value: string | number): TimeStamp | undefined {
  const text = String(value).trim();
  const month = text.match(/^((?:1[89]|20)\d{2})-(\d{2})(?:$|[-/.])/);
  if (month?.[1] && month[2]) {
    const valueMonth = Number(month[2]);
    if (valueMonth >= 1 && valueMonth <= 12) {
      return { year: Number(month[1]), month: valueMonth };
    }
  }
  const quarter = text.match(/^(?:q([1-4])\s+((?:1[89]|20)\d{2})|((?:1[89]|20)\d{2})-q([1-4]))$/i);
  if (quarter) {
    const q = Number(quarter[1] || quarter[4]);
    const year = Number(quarter[2] || quarter[3]);
    if (q >= 1 && q <= 4 && year) {
      return { year, quarter: q };
    }
  }
  const year = text.match(/^((?:1[89]|20)\d{2})$/);
  return year?.[1] ? { year: Number(year[1]) } : undefined;
}

export function yearFromX(value: string | number): number | undefined {
  const stamp = timeStamp(value);
  if (stamp) {
    return stamp.year;
  }
  const text = String(value).trim();
  const leading = text.match(/^((?:1[89]|20)\d{2})(?:$|[-/.])/);
  return leading?.[1] ? Number(leading[1]) : undefined;
}

function edgeMonth(stamp: TimeStamp, edge: 'start' | 'end'): number {
  if (stamp.quarter) {
    return edge === 'start' ? (stamp.quarter - 1) * 3 + 1 : stamp.quarter * 3;
  }
  if (stamp.month) {
    return stamp.month;
  }
  return edge === 'start' ? 1 : 12;
}

function stampKey(stamp: TimeStamp, edge: 'start' | 'end'): number {
  return stamp.year * 12 + edgeMonth(stamp, edge);
}

function stampLabel(stamp: TimeStamp): string {
  if (stamp.quarter) {
    return `Q${stamp.quarter} ${stamp.year}`;
  }
  if (stamp.month) {
    return `${FULL_MONTHS[stamp.month - 1]} ${stamp.year}`;
  }
  return String(stamp.year);
}

export function spanDisclosure(
  asked: string,
  rows: Array<{ x: string | number }>,
  now: number
): string | null {
  const span = yearSpanFromAsked(asked, now);
  if (span.since === undefined && span.until === undefined) {
    return null;
  }
  const stamps = rows
    .map((row) => timeStamp(row.x))
    .filter((stamp): stamp is TimeStamp => stamp !== undefined)
    .sort((left, right) => stampKey(left, 'start') - stampKey(right, 'start'));
  const start = stamps[0];
  const end = stamps[stamps.length - 1];
  if (!start || !end || stamps.length < Math.ceil(rows.length * 0.7)) {
    return null;
  }
  const bits: string[] = [];
  if (span.since !== undefined) {
    const askedStart = span.since * 12 + (span.sinceMonth ?? 1);
    if (stampKey(start, 'start') > askedStart) {
      const wanted = span.sinceMonth ? `${FULL_MONTHS[span.sinceMonth - 1]} ${span.since}` : String(span.since);
      bits.push(`Starts in ${stampLabel(start)}, not ${wanted}`);
    }
  }
  if (span.until !== undefined) {
    const askedEnd = span.until * 12 + (span.untilMonth ?? 12);
    if (stampKey(end, 'end') < askedEnd) {
      const wanted = span.untilMonth ? `${FULL_MONTHS[span.untilMonth - 1]} ${span.until}` : String(span.until);
      bits.push(`Ends in ${stampLabel(end)}, short of ${wanted}`);
    }
  } else if (span.since !== undefined && end.year < new Date(now).getUTCFullYear() - 1) {
    bits.push(`Ends in ${end.year}, short of ${new Date(now).getUTCFullYear()}`);
  }
  return bits.length > 0 ? `${bits.join('. ')}.` : null;
}

export function drawnYearSpan(rows: Array<{ x: string | number }>): YearSpan | null {
  if (rows.length === 0) {
    return null;
  }
  const years = rows.map((row) => yearFromX(row.x));
  const present = years.filter((year): year is number => year !== undefined);
  if (present.length < Math.ceil(rows.length * 0.7)) {
    return null;
  }
  const first = years.find((year) => year !== undefined);
  const last = [...years].reverse().find((year) => year !== undefined);
  if (first === undefined || last === undefined) {
    return null;
  }
  return { first: Math.min(first, last), last: Math.max(first, last) };
}

export function spanLabel(span: YearSpan): string {
  return span.first === span.last ? String(span.first) : `${span.first}-${span.last}`;
}

function namesRange(text: string, span: YearSpan): boolean {
  if (/\b(?:since|from)\s+(?:1[89]|20)\d{2}\b/i.test(text)) {
    return true;
  }
  const years = [...text.matchAll(/\b((?:1[89]|20)\d{2})\b/g)].map((match) => Number(match[1]));
  const named = new Set(years);
  if (span.first === span.last) {
    return named.has(span.first);
  }
  return named.has(span.first) && named.has(span.last);
}

export function withDrawnSpan(text: string, rows: Array<{ x: string | number }>): string {
  const span = drawnYearSpan(rows);
  if (!span) {
    return text;
  }
  const label = spanLabel(span);
  const range = /\b((?:1[89]|20)\d{2})\s*(?:-|–|—|to|through)\s*((?:1[89]|20)\d{2})\b/g;
  let next = text.replace(range, (full, start, end) => {
    const lo = Math.min(Number(start), Number(end));
    const hi = Math.max(Number(start), Number(end));
    const inside = lo >= span.first && hi <= span.last;
    const exact = lo === span.first && hi === span.last;
    if (inside && !exact) {
      return full;
    }
    return label;
  });
  const since = /\b(since|from)\s+((?:1[89]|20)\d{2})\b/gi;
  next = next.replace(since, (full, word, year) => {
    const value = Number(year);
    if (value < span.first || value > span.last) {
      return `${word} ${span.first}`;
    }
    return full;
  });
  if (next.includes(label) || namesRange(next, span)) {
    return next;
  }
  const trimmed = next.trim();
  if (!trimmed) {
    return label;
  }
  return `${trimmed}, ${label}`;
}
