/** Detect anonymous x labels like Country A, Team 3, Item B. */

const GENERIC_LABEL =
  /^(?:country|nation|team|item|category|company|player|city|film|movie|state|region|brand|product|shop|store|candidate|party|school|university|club|name|entity|entry|example|sample|option|choice|type|group|series|set|row|record|bar|label)\s+(?:#?\d+|[A-Z]\d*)$/i;

const GENERIC_PREFIX =
  /^(?:country|nation|team|item|category|company|player|city|film|state|region|brand|product)\s+[A-Z]$/i;

export function isGenericPlaceholderX(value: string): boolean {
  const label = value.trim();
  if (!label) {
    return true;
  }
  if (isRankIndexX(label)) {
    return true;
  }
  return GENERIC_LABEL.test(label) || GENERIC_PREFIX.test(label);
}

export function mostlyGenericPlaceholders(rows: Array<{ x: string | number }>): boolean {
  if (rows.length < 3) {
    return false;
  }
  const labels = rows.map((row) => String(row.x).trim());
  if (looksLikeSeries(labels)) {
    return false;
  }
  const hits = labels.filter((label) => isGenericPlaceholderX(label)).length;
  return hits >= Math.ceil(labels.length * 0.5);
}

const RANK_INDEX = /^(?:#|no\.?|number|rank|place|pos(?:ition)?)\s*#?\s*\d+$/i;
const BARE_INDEX = /^\d{1,2}$/;

function isRankIndexX(value: string): boolean {
  return RANK_INDEX.test(value) || BARE_INDEX.test(value);
}

function looksLikeSeries(names: string[]): boolean {
  if (names.length < 8) {
    return false;
  }
  const hits = names.filter((name) => {
    const n = name.trim();
    return (
      /^20\d{2}(?:\s*[-–/]\s*(?:\d{2}|20\d{2}))?$/.test(n) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(n) ||
      /^w(?:eek)?\s*\d+$/i.test(n) ||
      /^\d{4}$/.test(n)
    );
  }).length;
  return hits >= names.length * 0.7;
}

/** Real countries for illustrative country charts when lookup has no names. */
const FALLBACK_COUNTRIES = [
  'Japan',
  'Spain',
  'Brazil',
  'Nigeria',
  'India',
  'Norway',
  'Mexico',
  'Bangladesh',
  'Germany',
  'France',
  'Ethiopia',
  'United States',
  'Indonesia',
  'Egypt',
  'Colombia',
  'Vietnam',
  'Pakistan',
  'Italy',
  'Philippines',
  'South Africa',
] as const;

const FALLBACK_CITIES = [
  'Tokyo',
  'London',
  'São Paulo',
  'Lagos',
  'Mumbai',
  'Oslo',
  'Mexico City',
  'Dhaka',
  'Berlin',
  'Paris',
  'Addis Ababa',
  'New York',
  'Jakarta',
  'Cairo',
  'Bogotá',
] as const;

const FALLBACK_TEAMS = [
  'Arsenal',
  'Barcelona',
  'Bayern Munich',
  'Inter Milan',
  'Juventus',
  'Liverpool',
  'Manchester City',
  'Paris Saint-Germain',
  'Real Madrid',
  'Tottenham',
] as const;

export function fallbackEntitiesFromAsk(asked: string, count: number): string[] {
  const topic = asked.toLowerCase();
  let pool: readonly string[] = FALLBACK_COUNTRIES;

  if (/\b(city|cities|metro|urban)\b/.test(topic)) {
    pool = FALLBACK_CITIES;
  } else if (/\b(team|club|league|premier|nba|nfl|mlb|soccer|football)\b/.test(topic)) {
    pool = FALLBACK_TEAMS;
  } else if (/\b(countr(y|ies)|nation|nations|life expectancy|gdp|population)\b/.test(topic)) {
    pool = FALLBACK_COUNTRIES;
  }

  return [...pool].slice(0, Math.max(2, count));
}

export function hasGenericPlaceholders(rows: Array<{ x: string | number }>): boolean {
  return rows.some((row) => isGenericPlaceholderX(String(row.x)));
}

export function relabelGenericCategories(
  rows: Array<{ x: string | number; y: number }>,
  names: string[],
  asked: string
): Array<{ x: string | number; y: number }> {
  if (rows.length === 0 || !hasGenericPlaceholders(rows)) {
    return rows;
  }

  const replacements =
    names.length >= 2 ? names.slice(0, rows.length) : fallbackEntitiesFromAsk(asked, rows.length);

  if (replacements.length < 2) {
    return rows;
  }

  return rows.map((row, index) => ({
    x: replacements[index] ?? row.x,
    y: row.y,
  }));
}
