export type YearSpan = { first: number; last: number };

export function yearFromX(value: string | number): number | undefined {
  const match = String(value).trim().match(/^((?:19|20)\d{2})(?:$|[-/.])/);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
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
  if (next.includes(label)) {
    return next;
  }
  const trimmed = next.trim();
  if (!trimmed) {
    return label;
  }
  return `${trimmed}, ${label}`;
}
