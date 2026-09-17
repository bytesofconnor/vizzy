import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

export function parseFredCsv(csv: string): SeriesRow[] {
  const rows: SeriesRow[] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line || line.startsWith('DATE') || line.startsWith('#')) {
      continue;
    }
    const comma = line.indexOf(',');
    if (comma < 0) {
      continue;
    }
    const date = line.slice(0, comma).trim();
    const y = parseNumber(line.slice(comma + 1));
    if (!date || y === undefined) {
      continue;
    }
    rows.push({ x: date.slice(0, 7), y });
  }
  return rows;
}

export function fredCsvUrl(seriesId: string): string {
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
}
