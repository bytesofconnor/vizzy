import type { SeriesRow } from '../types';

const SKIP_NAME =
  /\b(world|income|ida |ibrd|oecd|euro area|european union|north america|south asia|sub-saharan|latin america|arab world|small states|fragile|dividend|classification|excluding|baltics|central europe|high income|low income|middle income|ida only|oecd members)\b/i;

type BankRow = {
  country?: { value?: string; id?: string };
  date?: string;
  value?: number | null;
};

export function parseWorldBank(text: string, take: 'high' | 'low' = 'high'): SeriesRow[] {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(body) || body.length < 2 || !Array.isArray(body[1])) {
    return [];
  }
  const rows: SeriesRow[] = [];
  for (const entry of body[1] as BankRow[]) {
    const name = entry.country?.value?.trim();
    const y = entry.value;
    if (!name || typeof y !== 'number' || !Number.isFinite(y) || SKIP_NAME.test(name)) {
      continue;
    }
    if (name.length > 40) {
      continue;
    }
    rows.push({ x: name, y: y >= 1000 ? Math.round(y) : Math.round(y * 1000) / 1000 });
  }
  rows.sort((a, b) => (take === 'low' ? a.y - b.y : b.y - a.y));
  return rows.slice(0, 15);
}

export function worldBankUrl(indicator: string, year = 2022): string {
  return `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(indicator)}?date=${year}:${year}&format=json&per_page=300`;
}
