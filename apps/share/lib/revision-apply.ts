import type { ChartSeed } from './seed';

function yearPattern(): RegExp {
  return /\b((?:19|20)\d{2})\b/g;
}

export function tryLocalRevision(
  seed: ChartSeed,
  asked: string
): { ok: true; seed: ChartSeed } | { ok: false; error: string } | undefined {
  const text = asked.replace(/\s+/g, ' ').trim();
  if (text.length < 3) {
    return undefined;
  }

  const years = unique(yearMentions(text));
  const dropOnly = isDropYearsOnly(text, years);
  if (dropOnly && years.length > 0) {
    const next = dropYears(seed.rows, years);
    if (next.length < 2) {
      return { ok: false, error: 'That would leave too little to chart. Keep at least two points.' };
    }
    if (next.length === seed.rows.length) {
      return {
        ok: false,
        error: `This chart doesn't have ${joinYears(years)}. Drop a year or category that's actually on it.`,
      };
    }
    return { ok: true, seed: withRows(seed, next) };
  }

  let rows = [...seed.rows];
  let chartType = seed.chartType;
  let area = seed.area;
  let changed = false;

  if (/\b(make it a line|switch to (?:a )?line)\b/i.test(text)) {
    chartType = 'line';
    changed = true;
  } else if (/\b(switch to bars?|make it (?:a )?bar)\b/i.test(text)) {
    chartType = 'bar';
    area = false;
    changed = true;
  } else if (/\b(fill the area|area under the line)\b/i.test(text)) {
    chartType = 'line';
    area = true;
    changed = true;
  }

  if (/\bsort by\b/i.test(text)) {
    rows = [...rows].sort((a, b) => b.y - a.y);
    changed = true;
  }

  const top = text.match(/\b(?:keep only the )?top\s+(five|5|three|3|ten|10)\b/i);
  if (top) {
    const n = /10|ten/i.test(top[1] ?? '') ? 10 : /3|three/i.test(top[1] ?? '') ? 3 : 5;
    rows = [...rows].sort((a, b) => b.y - a.y).slice(0, Math.min(n, rows.length));
    changed = true;
  }

  const dropBottom = text.match(/\bdrop the bottom\s+(three|3|two|2)\b/i);
  if (dropBottom && rows.length > 4) {
    const n = /2|two/i.test(dropBottom[1] ?? '') ? 2 : 3;
    rows = [...rows].sort((a, b) => b.y - a.y).slice(0, Math.max(2, rows.length - n));
    changed = true;
  }

  if (years.length > 0 && /\bdrop\b/i.test(text)) {
    const next = dropYears(rows, years);
    if (next.length >= 2 && next.length < rows.length) {
      rows = next;
      changed = true;
    }
  }

  if (!changed || rows.length < 2) {
    return undefined;
  }
  if (!isMostlyStructural(text, years)) {
    return undefined;
  }
  return { ok: true, seed: { ...withRows(seed, rows), chartType, area } };
}

function isDropYearsOnly(text: string, years: string[]): boolean {
  if (years.length === 0) {
    return false;
  }
  const stripped = text
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .replace(/\b(please|pls|drop|and|the|years?|year)\b/g, ' ')
    .replace(yearPattern(), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length === 0;
}

function isMostlyStructural(text: string, years: string[]): boolean {
  const stripped = text
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .replace(
      /\b(please|pls|make|it|a|an|the|to|by|and|under|only|keep|drop|bottom|top|three|two|five|ten|3|2|5|10|sort|switch|bars?|line|chart|fill|area|line|value|votes?)\b/g,
      ' '
    )
    .replace(yearPattern(), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length === 0 || years.length > 0 && stripped.length < 12;
}

function yearMentions(text: string): string[] {
  return [...text.matchAll(yearPattern())].map((match) => match[1] ?? '').filter(Boolean);
}

function dropYears(rows: ChartSeed['rows'], years: string[]): ChartSeed['rows'] {
  return rows.filter((row) => !years.some((year) => hasYear(row.x, year)));
}

function hasYear(x: string | number, year: string): boolean {
  const text = String(x).trim();
  return text === year || new RegExp(`(?:^|\\D)${year}(?:\\D|$)`).test(text);
}

function withRows(seed: ChartSeed, rows: ChartSeed['rows']): ChartSeed {
  return { ...seed, rows };
}

function joinYears(years: string[]): string {
  if (years.length === 1) {
    return years[0] ?? 'that year';
  }
  if (years.length === 2) {
    return `${years[0]} or ${years[1]}`;
  }
  return years.join(', ');
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
