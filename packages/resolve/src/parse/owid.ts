import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

export type OwidSpec = {
  slug: string;
  value: RegExp;
  entity?: string;
  rank?: boolean;
  scale?: number;
};

const SKIP_ENTITY =
  /^(world|africa|asia|europe|european union|north america|south america|oceania|high-income|low-income|upper-middle|lower-middle|eu \(27\))/i;

export const OWID_SPEC: Record<string, OwidSpec> = {
  temperature_anomaly: {
    slug: 'temperature-anomaly',
    value: /^Average$/i,
    entity: 'World',
  },
  arctic_sea_ice: {
    slug: 'arctic-sea-ice',
    value: /Minimum \(September\)/i,
    entity: 'Arctic Ocean',
  },
  us_wildfire_area: {
    slug: 'annual-area-burnt-by-wildfires',
    value: /burnt/i,
    entity: 'United States',
  },
  lithium_production: {
    slug: 'lithium-production',
    value: /Lithium Production/i,
    rank: true,
  },
  ev_share: {
    slug: 'electric-car-sales-share',
    value: /Share of new cars/i,
    rank: true,
  },
  oil_production: {
    slug: 'oil-production-by-country',
    value: /^Oil$/i,
    rank: true,
  },
};

export function owidCsvUrl(slug: string): string {
  return `https://ourworldindata.org/grapher/${encodeURIComponent(slug)}.csv`;
}

export function parseOwidCsv(csv: string, spec: OwidSpec): SeriesRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = splitCsv(lines[0] ?? '');
  const entityCol = header.findIndex((name) => /^entity$/i.test(name));
  const yearCol = header.findIndex((name) => /^year$/i.test(name));
  const valueCol = header.findIndex((name) => spec.value.test(name));
  if (entityCol < 0 || yearCol < 0 || valueCol < 0) {
    return [];
  }
  const parsed: Array<{ entity: string; year: number; y: number }> = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsv(line);
    const entity = (cols[entityCol] ?? '').trim();
    const year = Number(cols[yearCol]);
    const y = parseNumber(cols[valueCol] ?? '');
    if (!entity || !Number.isFinite(year) || y === undefined) {
      continue;
    }
    parsed.push({ entity, year, y: spec.scale ? y * spec.scale : y });
  }
  if (spec.entity) {
    return parsed
      .filter((row) => row.entity === spec.entity)
      .sort((a, b) => a.year - b.year)
      .map((row) => ({ x: String(row.year), y: roundY(row.y) }));
  }
  if (!spec.rank) {
    return [];
  }
  const years = [...new Set(parsed.map((row) => row.year))].sort((a, b) => b - a);
  for (const year of years) {
    const rows = parsed
      .filter((row) => row.year === year && !SKIP_ENTITY.test(row.entity) && row.entity.length <= 40)
      .map((row) => ({ x: row.entity.slice(0, 40), y: roundY(row.y) }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 15);
    if (rows.length >= 3) {
      return rows;
    }
  }
  return [];
}

export function parseOwidOzone(csv: string): SeriesRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = splitCsv(lines[0] ?? '');
  const yearCol = header.findIndex((name) => /^year$/i.test(name.trim()));
  const areaCol = header.findIndex((name) => /maximum hole area/i.test(name));
  if (yearCol < 0 || areaCol < 0) {
    return [];
  }
  const rows: SeriesRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsv(line);
    const year = cols[yearCol]?.trim();
    if (!year || !/^\d{4}$/.test(year)) {
      continue;
    }
    const km2 = parseNumber(cols[areaCol] ?? '');
    if (km2 === undefined) {
      continue;
    }
    rows.push({ x: year, y: Math.round((km2 / 1_000_000) * 10) / 10 });
  }
  return rows;
}

export const OWID_OZONE_URL = 'https://ourworldindata.org/grapher/antarctic-ozone-hole-area.csv';

function splitCsv(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function roundY(value: number): number {
  if (Math.abs(value) >= 100) {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value * 1000) / 1000;
}
