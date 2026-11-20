import type { SeriesRow } from '../types';

const SKIP_NAME =
  /\b(world|income|ida |ibrd|oecd|euro area|european union|north america|south asia|sub-saharan|latin america|arab world|small states|fragile|dividend|classification|excluding|baltics|central europe|high income|low income|middle income|ida only|oecd members|other economies|rest of the world|africa eastern|africa western|east asia|europe & central|middle east|not classified|heavily indebted)\b/i;

type BankRow = {
  country?: { value?: string; id?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
};

function skipEntity(entry: BankRow): boolean {
  const iso = entry.countryiso3code;
  if (typeof iso === 'string' && iso.trim().length !== 3) {
    return true;
  }
  const name = entry.country?.value?.trim() ?? '';
  if (!name || name.length > 48) {
    return true;
  }
  return SKIP_NAME.test(name);
}

export function parseWorldBank(
  text: string,
  take: 'high' | 'low' = 'high',
  shape: 'snapshot' | 'panel' = 'snapshot'
): SeriesRow[] {
  if (shape === 'panel') {
    return parsePanel(text);
  }
  return parseSnapshot(text, take);
}

function parsePanel(text: string): SeriesRow[] {
  const entries = bankEntries(text);
  const rows: SeriesRow[] = [];
  for (const entry of entries) {
    const name = entry.country?.value?.trim();
    const y = entry.value;
    const year = (entry.date ?? '').slice(0, 4);
    if (!name || !/^(?:19|20)\d{2}$/.test(year) || typeof y !== 'number' || !Number.isFinite(y)) {
      continue;
    }
    if (skipEntity(entry)) {
      continue;
    }
    const rounded = y >= 1000 ? Math.round(y) : Math.round(y * 1000) / 1000;
    rows.push({ x: year, y: rounded, series: name });
  }
  rows.sort((a, b) => String(a.x).localeCompare(String(b.x)) || String(a.series).localeCompare(String(b.series)));
  return rows;
}

function parseSnapshot(text: string, take: 'high' | 'low'): SeriesRow[] {
  const latest = new Map<string, { y: number; date: string }>();
  for (const entry of bankEntries(text)) {
    const name = entry.country?.value?.trim();
    const y = entry.value;
    if (!name || typeof y !== 'number' || !Number.isFinite(y) || skipEntity(entry)) {
      continue;
    }
    const date = entry.date ?? '';
    const rounded = y >= 1000 ? Math.round(y) : Math.round(y * 1000) / 1000;
    const prev = latest.get(name);
    if (!prev || date >= prev.date) {
      latest.set(name, { y: rounded, date });
    }
  }
  const rows = [...latest.entries()].map(([x, item]) => ({ x, y: item.y }));
  rows.sort((a, b) => (take === 'low' ? a.y - b.y : b.y - a.y));
  return rows;
}

function bankEntries(text: string): BankRow[] {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(body) || body.length < 2 || !Array.isArray(body[1])) {
    return [];
  }
  return body[1] as BankRow[];
}

export function worldBankUrl(indicator: string, span?: { since?: number; until?: number }): string {
  const since = span?.since ?? 2015;
  const until = span?.until ?? new Date().getUTCFullYear();
  return `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(indicator)}?date=${since}:${until}&format=json&per_page=20000`;
}
