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

export function monthlyClose(csv: string): SeriesRow[] {
  const lastCloseByMonth = new Map<string, number>();
  for (const line of csv.split(/\r?\n/)) {
    if (!line || line.startsWith('DATE') || line.startsWith('#')) {
      continue;
    }
    const comma = line.indexOf(',');
    if (comma < 0) {
      continue;
    }
    const month = line.slice(0, comma).trim().slice(0, 7);
    const y = parseNumber(line.slice(comma + 1));
    if (!/^(?:19|20)\d{2}-\d{2}$/.test(month) || y === undefined) {
      continue;
    }
    lastCloseByMonth.set(month, y);
  }
  return [...lastCloseByMonth.entries()].map(([x, y]) => ({ x, y }));
}

/** FRED's graph CSV keeps only the first 12 series in one `id` list. */
export const FRED_SERIES_BATCH = 12;

export const STATE_UNEMPLOYMENT: readonly (readonly [id: string, name: string])[] = [
  ['ALUR', 'Alabama'],
  ['AKUR', 'Alaska'],
  ['AZUR', 'Arizona'],
  ['ARUR', 'Arkansas'],
  ['CAUR', 'California'],
  ['COUR', 'Colorado'],
  ['CTUR', 'Connecticut'],
  ['DEUR', 'Delaware'],
  ['FLUR', 'Florida'],
  ['GAUR', 'Georgia'],
  ['HIUR', 'Hawaii'],
  ['IDUR', 'Idaho'],
  ['ILUR', 'Illinois'],
  ['INUR', 'Indiana'],
  ['IAUR', 'Iowa'],
  ['KSUR', 'Kansas'],
  ['KYUR', 'Kentucky'],
  ['LAUR', 'Louisiana'],
  ['MEUR', 'Maine'],
  ['MDUR', 'Maryland'],
  ['MAUR', 'Massachusetts'],
  ['MIUR', 'Michigan'],
  ['MNUR', 'Minnesota'],
  ['MSUR', 'Mississippi'],
  ['MOUR', 'Missouri'],
  ['MTUR', 'Montana'],
  ['NEUR', 'Nebraska'],
  ['NVUR', 'Nevada'],
  ['NHUR', 'New Hampshire'],
  ['NJUR', 'New Jersey'],
  ['NMUR', 'New Mexico'],
  ['NYUR', 'New York'],
  ['NCUR', 'North Carolina'],
  ['NDUR', 'North Dakota'],
  ['OHUR', 'Ohio'],
  ['OKUR', 'Oklahoma'],
  ['ORUR', 'Oregon'],
  ['PAUR', 'Pennsylvania'],
  ['RIUR', 'Rhode Island'],
  ['SCUR', 'South Carolina'],
  ['SDUR', 'South Dakota'],
  ['TNUR', 'Tennessee'],
  ['TXUR', 'Texas'],
  ['UTUR', 'Utah'],
  ['VTUR', 'Vermont'],
  ['VAUR', 'Virginia'],
  ['WAUR', 'Washington'],
  ['WVUR', 'West Virginia'],
  ['WIUR', 'Wisconsin'],
  ['WYUR', 'Wyoming'],
];

export function fredCsvUrl(seriesId: string): string {
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
}

export function stateUnemploymentUrls(): string[] {
  const ids = STATE_UNEMPLOYMENT.map(([code]) => code);
  const urls: string[] = [];
  for (let index = 0; index < ids.length; index += FRED_SERIES_BATCH) {
    const batch = ids.slice(index, index + FRED_SERIES_BATCH);
    const id = batch.map((code) => encodeURIComponent(code)).join(',');
    urls.push(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  }
  return urls;
}

export function parseFredAnnual(csv: string): SeriesRow[] {
  const byYear = new Map<string, number>();
  for (const row of parseFredCsv(csv)) {
    const year = String(row.x).slice(0, 4);
    if (!/^(?:19|20)\d{2}$/.test(year)) {
      continue;
    }
    byYear.set(year, row.y);
  }
  return [...byYear.entries()].map(([x, y]) => ({ x, y }));
}

export function parseFredLatestColumns(csv: string): SeriesRow[] {
  const names = new Map(STATE_UNEMPLOYMENT);
  const lines = csv.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  const header = (lines[0] ?? '').split(',').map((cell) => cell.trim());
  const latest = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    for (let index = 1; index < header.length; index += 1) {
      const id = header[index] ?? '';
      const y = parseNumber(cells[index] ?? '');
      if (!names.has(id) || y === undefined) {
        continue;
      }
      latest.set(id, y);
    }
  }
  return [...latest.entries()]
    .map(([id, y]) => ({ x: names.get(id) ?? id, y }))
    .sort((a, b) => b.y - a.y || a.x.localeCompare(b.x));
}
