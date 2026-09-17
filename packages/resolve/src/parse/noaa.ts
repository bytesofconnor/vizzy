import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

/** NOAA annual mean file: year  mean  unc  (comment lines start with #). */
export function parseNoaaCo2(text: string): SeriesRow[] {
  const rows: SeriesRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    const year = parts[0];
    const mean = parts[1];
    if (!year || !mean || !/^\d{4}$/.test(year)) {
      continue;
    }
    const y = parseNumber(mean);
    if (y === undefined) {
      continue;
    }
    rows.push({ x: year, y });
  }
  return rows;
}

export const NOAA_CO2_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt';
