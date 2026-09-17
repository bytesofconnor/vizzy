import { yearOfX } from './normalize';
import type { SeriesRow } from './types';

export const MAX_ROWS = 24;

export function windowSince(rows: SeriesRow[], sinceYear: number | undefined): SeriesRow[] {
  if (!sinceYear) {
    return rows;
  }
  return rows.filter((row) => {
    const year = yearOfX(row.x);
    return year === undefined || year >= sinceYear;
  });
}

/** Keep first and last; pick evenly in between. */
export function downsample(rows: SeriesRow[], max = MAX_ROWS): SeriesRow[] {
  if (rows.length <= max) {
    return rows;
  }
  if (max < 2) {
    return rows.slice(0, max);
  }
  const last = max - 1;
  const out: SeriesRow[] = [];
  const seen = new Set<number>();
  for (let i = 0; i <= last; i += 1) {
    const index = Math.round((i * (rows.length - 1)) / last);
    if (seen.has(index)) {
      continue;
    }
    seen.add(index);
    const row = rows[index];
    if (row) {
      out.push(row);
    }
  }
  return out;
}
