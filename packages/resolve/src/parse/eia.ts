import type { SeriesRow } from '../types';

export const EIA_GENERATION_URL = 'https://www.eia.gov/totalenergy/data/browser/csv.php?tbl=T07.02A';

const TOTAL = 'ELETPUS';

const MAJORS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'NGETPUS', name: 'Natural gas' },
  { id: 'CLETPUS', name: 'Coal' },
  { id: 'NUETPUS', name: 'Nuclear' },
  { id: 'WYETPUS', name: 'Wind' },
  { id: 'HVETPUS', name: 'Hydro' },
  { id: 'SOETPUS', name: 'Solar' },
];

export function parseEiaGeneration(
  text: string,
  now = Date.now(),
  askedYear?: number
): { rows: SeriesRow[]; snapshotYear?: string } {
  const annual = readAnnual(text);
  const asked = askedYear === undefined ? undefined : String(askedYear);
  const year =
    asked !== undefined && fullYear(annual, asked)
      ? asked
      : latestFullYear(annual, new Date(now).getUTCFullYear());
  if (!year) {
    return { rows: [] };
  }
  const values = annual.get(year);
  const total = values?.get(TOTAL);
  if (!values || total === undefined || total <= 0) {
    return { rows: [] };
  }
  const majors: number[] = [];
  for (const major of MAJORS) {
    const value = values.get(major.id);
    if (value === undefined) {
      return { rows: [] };
    }
    majors.push(value);
  }
  const tenths = majors.map((value) => Math.round((value / total) * 1000));
  let otherTenths = 1000 - tenths.reduce((sum, value) => sum + value, 0);
  if (otherTenths < -20) {
    return { rows: [] };
  }
  if (otherTenths < 0) {
    const largest = tenths.indexOf(Math.max(...tenths));
    tenths[largest] = (tenths[largest] ?? 0) + otherTenths;
    otherTenths = 0;
  }
  const rows: SeriesRow[] = MAJORS.map((major, index) => ({
    x: major.name,
    y: (tenths[index] ?? 0) / 10,
  }));
  rows.push({ x: 'Petroleum and other', y: otherTenths / 10 });
  rows.sort((a, b) => b.y - a.y || String(a.x).localeCompare(String(b.x)));
  return { rows, snapshotYear: year };
}

function readAnnual(text: string): Map<string, Map<string, number>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = cells(lines[0] ?? '');
  const msnAt = header.indexOf('MSN');
  const dateAt = header.indexOf('YYYYMM');
  const valueAt = header.indexOf('Value');
  const annual = new Map<string, Map<string, number>>();
  if (msnAt < 0 || dateAt < 0 || valueAt < 0) {
    return annual;
  }
  for (const line of lines.slice(1)) {
    const row = cells(line);
    const msn = row[msnAt] ?? '';
    const stamp = row[dateAt] ?? '';
    // Annual totals are YYYYMM with month 13. Months 01-12 are not the year.
    if (!msn || !/^\d{4}13$/.test(stamp)) {
      continue;
    }
    const value = Number(row[valueAt]);
    if (!Number.isFinite(value)) {
      continue;
    }
    const year = stamp.slice(0, 4);
    const bucket = annual.get(year) ?? new Map<string, number>();
    bucket.set(msn, value);
    annual.set(year, bucket);
  }
  return annual;
}

function fullYear(annual: Map<string, Map<string, number>>, year: string): boolean {
  const values = annual.get(year);
  const total = values?.get(TOTAL);
  return total !== undefined && total > 0 && MAJORS.every((major) => values.has(major.id));
}

function latestFullYear(annual: Map<string, Map<string, number>>, currentYear: number): string | undefined {
  const years = [...annual.keys()].filter((year) => Number(year) < currentYear).sort((a, b) => b.localeCompare(a));
  return years.find((year) => fullYear(annual, year));
}

function cells(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}
