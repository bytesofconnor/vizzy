export type NamedSeriesRow = { x: string | number; y: number; series?: string };

export type HonoredSeries = {
  rows: NamedSeriesRow[];
  title?: string;
  note?: string;
  multi: boolean;
};

const TOKEN = String.raw`[A-Za-z][A-Za-z0-9+.'’\-]*`;
const METRIC_WORDS = new Set([
  'a',
  'an',
  'and',
  'annual',
  'by',
  'chart',
  'compare',
  'electricity',
  'for',
  'from',
  'generation',
  'in',
  'monthly',
  'of',
  'or',
  'over',
  'per',
  'percent',
  'percentage',
  'plot',
  'power',
  'price',
  'prices',
  'rate',
  'rates',
  'rent',
  'rents',
  'revenue',
  'sales',
  'share',
  'shares',
  'show',
  'since',
  'subscriber',
  'subscribers',
  'the',
  'total',
  'us',
  'user',
  'users',
  'versus',
  'vs',
  'with',
  'yearly',
]);

export function honorNamedSeries(input: {
  asked: string;
  notes: string;
  rows: NamedSeriesRow[];
}): HonoredSeries | null {
  const names = namedSeriesInPrompt(input.asked);
  if (names.length < 2) {
    return null;
  }

  const fromNotes = rowsFromNotes(input.notes, names);
  const fromDraft = rowsFromDraft(input.rows, names);
  const chosen = betterRows(fromNotes, fromDraft, input.rows, names);
  const limited = capSeries(chosen);
  const shown = covered(limited, names);
  const multi = distinctSeries(limited).length >= 2;
  if (shown.length === names.length && shown.length >= 2) {
    return { rows: limited, multi };
  }

  const focus = shown.length > 0 ? dominant(limited, names, shown) : inferredName(input.notes, names);
  const labeled =
    shown.length === 0 && focus
      ? limited.map((row) => ({ ...row, series: focus }))
      : limited;
  const title = honestTitle(names, labeled, focus);
  const missing = names.filter((name) => !covered(labeled, names).includes(name));
  const note = missing.length > 0 ? omissionNote(labeled, missing) : undefined;
  return {
    rows: labeled,
    ...(title ? { title } : {}),
    ...(note ? { note } : {}),
    multi: distinctSeries(labeled).length >= 2,
  };
}

export function namedSeriesInPrompt(asked: string): string[] {
  const line = asked.split('\n')[0]?.trim() ?? '';
  const listed = commaList(line);
  if (listed.length >= 2) {
    return listed;
  }
  return versusPair(line);
}

function commaList(line: string): string[] {
  const match = line.match(
    new RegExp(String.raw`\b((?:${TOKEN}\s*,\s*)+${TOKEN})\s*,?\s+and\s+(${TOKEN})(?![A-Za-z0-9])`, 'i')
  );
  if (!match?.[1] || !match[2]) {
    return [];
  }
  const items = `${match[1]}, ${match[2]}`.split(',').map((item) => item.trim()).filter(Boolean);
  if (items.length < 2 || items.length > 6) {
    return [];
  }
  if (items.some((item) => METRIC_WORDS.has(item.toLowerCase()))) {
    return [];
  }
  return items;
}

function versusPair(line: string): string[] {
  const parts = line.split(/\s+(?:versus|vs\.?)\s+/i);
  if (parts.length < 2) {
    return [];
  }
  const left = contentTokens(parts[0] ?? '').at(-1);
  const right = contentTokens(parts[1] ?? '')[0];
  if (!left || !right || left.toLowerCase() === right.toLowerCase()) {
    return [];
  }
  return [left, right];
}

function contentTokens(side: string): string[] {
  return [...side.matchAll(new RegExp(TOKEN, 'g'))]
    .map((match) => match[0])
    .filter((token) => !METRIC_WORDS.has(token.toLowerCase()));
}

function rowsFromNotes(notes: string, names: string[]): NamedSeriesRow[] {
  const tables = markdownTables(notes);
  const rows: NamedSeriesRow[] = [];
  for (const table of tables) {
    const wide = fromWide(table.rows, names);
    if (wide.length >= 2) {
      rows.push(...wide);
      continue;
    }
    const long = fromLong(table.rows, names);
    if (long.length >= 2) {
      rows.push(...long);
      continue;
    }
    const single = fromSingle(table.rows, names, table.preface);
    if (single.length >= 2) {
      rows.push(...single);
    }
  }
  return dedupe(rows);
}

function rowsFromDraft(rows: NamedSeriesRow[], names: string[]): NamedSeriesRow[] {
  const withSeries = rows
    .map((row) => {
      const series = row.series ? matchName(row.series, names) : undefined;
      return series ? { x: row.x, y: row.y, series } : null;
    })
    .filter((row): row is NamedSeriesRow => row !== null);
  if (covered(withSeries, names).length >= 1 && withSeries.length >= 2) {
    return dedupe(withSeries);
  }

  const asCategory = rows
    .map((row) => {
      const name = matchName(String(row.x), names);
      return name ? { x: name, y: row.y } : null;
    })
    .filter((row): row is NamedSeriesRow => row !== null);
  if (asCategory.length >= 2 && asCategory.length >= Math.ceil(rows.length * 0.8)) {
    return dedupe(asCategory);
  }
  return [];
}

function betterRows(
  fromNotes: NamedSeriesRow[],
  fromDraft: NamedSeriesRow[],
  original: NamedSeriesRow[],
  names: string[]
): NamedSeriesRow[] {
  const ranked = [fromNotes, fromDraft].sort((a, b) => {
    const cover = covered(b, names).length - covered(a, names).length;
    if (cover !== 0) {
      return cover;
    }
    return b.length - a.length;
  });
  const best = ranked[0];
  if (best && best.length >= 2 && covered(best, names).length > 0) {
    return best;
  }
  return original.map((row) => ({ x: row.x, y: row.y, ...(row.series ? { series: row.series } : {}) }));
}

function fromWide(table: string[][], names: string[]): NamedSeriesRow[] {
  const header = table[0] ?? [];
  const seriesCols = header
    .map((cell, index) => ({ index, name: matchName(cell, names) }))
    .filter((col): col is { index: number; name: string } => Boolean(col.name) && col.index > 0);
  if (seriesCols.length === 0) {
    return [];
  }
  const rows: NamedSeriesRow[] = [];
  for (const line of table.slice(1)) {
    const x = line[0]?.trim();
    if (!x || matchName(x, names)) {
      continue;
    }
    for (const col of seriesCols) {
      const y = numericCell(line[col.index] ?? '');
      if (y === null) {
        continue;
      }
      rows.push({ x, y, series: col.name });
    }
  }
  return rows;
}

function fromLong(table: string[][], names: string[]): NamedSeriesRow[] {
  const body = table.slice(1);
  let seriesIdx = -1;
  let best = 0;
  const width = table[0]?.length ?? 0;
  for (let index = 0; index < width; index += 1) {
    const hits = body.filter((row) => matchName(row[index] ?? '', names)).length;
    if (hits > best) {
      best = hits;
      seriesIdx = index;
    }
  }
  if (seriesIdx < 0 || best < 2) {
    return [];
  }
  const yIdx = numericColumn(table, seriesIdx);
  if (yIdx < 0) {
    return [];
  }
  const xIdx = [0, 1, 2].find((index) => index !== seriesIdx && index !== yIdx) ?? 0;
  const rows: NamedSeriesRow[] = [];
  for (const line of body) {
    const series = matchName(line[seriesIdx] ?? '', names);
    const y = numericCell(line[yIdx] ?? '');
    const x = line[xIdx]?.trim();
    if (!series || y === null || !x) {
      continue;
    }
    rows.push({ x, y, series });
  }
  return rows;
}

function fromSingle(table: string[][], names: string[], preface: string): NamedSeriesRow[] {
  const label = soleName(preface, names);
  if (!label) {
    return [];
  }
  const yIdx = numericColumn(table, -1);
  if (yIdx < 0) {
    return [];
  }
  const xIdx = yIdx === 0 ? 1 : 0;
  const rows: NamedSeriesRow[] = [];
  for (const line of table.slice(1)) {
    const x = line[xIdx]?.trim();
    const y = numericCell(line[yIdx] ?? '');
    if (!x || y === null || matchName(x, names)) {
      continue;
    }
    rows.push({ x, y, series: label });
  }
  return rows;
}

function numericColumn(table: string[][], skip: number): number {
  const width = table[0]?.length ?? 0;
  let best = -1;
  let hits = 0;
  for (let index = 0; index < width; index += 1) {
    if (index === skip) {
      continue;
    }
    const values = table.slice(1).map((row) => numericCell(row[index] ?? '')).filter((value): value is number => value !== null);
    const years = values.filter((value) => isYear(value)).length;
    if (values.length > hits && years < values.length) {
      hits = values.length;
      best = index;
    }
  }
  return best;
}

function markdownTables(notes: string): Array<{ preface: string; rows: string[][] }> {
  const lines = notes.split('\n');
  const tables: Array<{ preface: string; rows: string[][] }> = [];
  let index = 0;
  let prefaceStart = 0;
  while (index < lines.length) {
    if (!isTableLine(lines[index] ?? '')) {
      index += 1;
      continue;
    }
    const preface = lines.slice(prefaceStart, index).join('\n');
    const block: string[][] = [];
    while (index < lines.length && (isTableLine(lines[index] ?? '') || (lines[index] ?? '').trim() === '')) {
      if (isTableLine(lines[index] ?? '')) {
        block.push(cells(lines[index] ?? ''));
      }
      index += 1;
      if (index < lines.length && (lines[index] ?? '').trim() !== '' && !isTableLine(lines[index] ?? '')) {
        break;
      }
    }
    const rows = block.filter((row) => row.length >= 2 && !isRule(row));
    if (rows.length >= 2) {
      tables.push({ preface, rows });
    }
    prefaceStart = index;
  }
  return tables;
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('|') && cells(trimmed).length >= 2;
}

function cells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isRule(row: string[]): boolean {
  return row.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, '')));
}

function matchName(cell: string, names: string[]): string | undefined {
  let found: string | undefined;
  for (const name of names) {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(name)}(?![A-Za-z0-9])`, 'i');
    if (pattern.test(cell) && (!found || name.length > found.length)) {
      found = name;
    }
  }
  return found;
}

function soleName(preface: string, names: string[]): string | undefined {
  const hits = names.filter((name) => matchName(preface, [name]));
  return hits.length === 1 ? hits[0] : undefined;
}

function covered(rows: NamedSeriesRow[], names: string[]): string[] {
  return names.filter((name) =>
    rows.some((row) => row.series === name || matchName(String(row.x), [name]) === name)
  );
}

function distinctSeries(rows: NamedSeriesRow[]): string[] {
  return [...new Set(rows.map((row) => row.series).filter((series): series is string => Boolean(series)))];
}

function dominant(rows: NamedSeriesRow[], names: string[], shown: string[]): string {
  const counts = new Map<string, number>();
  for (const name of shown) {
    counts.set(
      name,
      rows.filter((row) => row.series === name || matchName(String(row.x), [name]) === name).length
    );
  }
  const ranked = [...shown].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || names.indexOf(a) - names.indexOf(b));
  const leader = ranked[0] ?? names[0] ?? '';
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const share = total > 0 ? (counts.get(leader) ?? 0) / total : 0;
  if (shown.length === 1 || share >= 0.7) {
    return leader;
  }
  return '';
}

function inferredName(notes: string, names: string[]): string {
  const scores = names.map((name) => ({ name, score: countWord(notes, name) }));
  scores.sort((a, b) => b.score - a.score || names.indexOf(a.name) - names.indexOf(b.name));
  const top = scores[0];
  const next = scores[1];
  if (top && top.score > 0 && top.score > (next?.score ?? 0)) {
    return top.name;
  }
  return names[0] ?? '';
}

function honestTitle(names: string[], rows: NamedSeriesRow[], focus: string): string | undefined {
  const shown = covered(rows, names);
  if (shown.length === names.length) {
    return undefined;
  }
  const range = xRange(rows);
  const year = singleYear(rows);
  if (focus && (shown.length <= 1 || dominant(rows, names, shown) === focus)) {
    if (year) {
      return `mostly ${focus} ${year}`;
    }
    return range ? `mostly ${focus}, ${range}` : `mostly ${focus}`;
  }
  const list = shown.length > 0 ? joinNames(shown) : focus;
  if (!list) {
    return undefined;
  }
  return range ? `${list}, ${range}` : list;
}

function omissionNote(rows: NamedSeriesRow[], missing: string[]): string {
  const range = xRange(rows);
  const span = range ? ` for ${range}` : '';
  const dropped = joinNames(missing);
  return `Missing ${dropped}${span}.`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function xRange(rows: NamedSeriesRow[]): string | undefined {
  const years = rowYears(rows);
  if (years.length < Math.ceil(rows.length * 0.7)) {
    return undefined;
  }
  const first = years[0];
  const last = years[years.length - 1];
  if (first === undefined || last === undefined) {
    return undefined;
  }
  return first === last ? String(first) : `${first}-${last}`;
}

function singleYear(rows: NamedSeriesRow[]): string | undefined {
  const years = rowYears(rows);
  if (years.length === 0 || years.length < Math.ceil(rows.length * 0.7)) {
    return undefined;
  }
  const first = years[0];
  return years.every((year) => year === first) ? String(first) : undefined;
}

function rowYears(rows: NamedSeriesRow[]): number[] {
  const years: number[] = [];
  for (const row of rows) {
    const found = [...String(row.x).matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
    const year = found[0];
    if (year !== undefined) {
      years.push(year);
    }
  }
  years.sort((a, b) => a - b);
  return years;
}

function capSeries(rows: NamedSeriesRow[]): NamedSeriesRow[] {
  const order: string[] = [];
  const groups = new Map<string, NamedSeriesRow[]>();
  for (const row of dedupe(rows)) {
    const key = row.series ?? '';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)?.push(row);
  }
  const budget = Math.max(2, Math.floor(72 / Math.max(order.length, 1)));
  const out: NamedSeriesRow[] = [];
  for (const key of order) {
    const list = groups.get(key) ?? [];
    out.push(...list.slice(-budget));
  }
  return out;
}

function dedupe(rows: NamedSeriesRow[]): NamedSeriesRow[] {
  const seen = new Set<string>();
  const out: NamedSeriesRow[] = [];
  for (const row of rows) {
    const key = `${row.series ?? ''}\t${row.x}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(row);
  }
  return out;
}

function numericCell(cell: string): number | null {
  const cleaned = cell.replace(/,/g, '').replace(/%/g, '').trim();
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function isYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1800 && value <= 2100;
}

function countWord(text: string, name: string): number {
  const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(name)}(?![A-Za-z0-9])`, 'gi');
  return text.match(pattern)?.length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
