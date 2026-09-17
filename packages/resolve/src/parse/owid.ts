import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

/** NASA Ozone Watch via Our World in Data. Area column is km². */
export function parseOwidOzone(csv: string): SeriesRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = (lines[0] ?? '').split(',');
  const yearCol = header.findIndex((name) => /^year$/i.test(name.trim()));
  const areaCol = header.findIndex((name) => /maximum hole area/i.test(name));
  if (yearCol < 0 || areaCol < 0) {
    return [];
  }
  const rows: SeriesRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
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
