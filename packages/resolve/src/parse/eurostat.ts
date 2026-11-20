import type { SeriesRow } from '../types';

const GEO: Record<string, string> = {
  Austria: 'AT',
  Belgium: 'BE',
  Bulgaria: 'BG',
  Croatia: 'HR',
  Cyprus: 'CY',
  Czechia: 'CZ',
  Denmark: 'DK',
  Estonia: 'EE',
  Finland: 'FI',
  France: 'FR',
  Germany: 'DE',
  Greece: 'EL',
  Hungary: 'HU',
  Ireland: 'IE',
  Italy: 'IT',
  Latvia: 'LV',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  Malta: 'MT',
  Netherlands: 'NL',
  Poland: 'PL',
  Portugal: 'PT',
  Romania: 'RO',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Spain: 'ES',
  Sweden: 'SE',
};

type EurostatCategory = {
  index?: Record<string, number>;
  label?: Record<string, string>;
};

type EurostatBody = {
  id?: string[];
  size?: number[];
  value?: Record<string, number | null>;
  dimension?: Record<string, { category?: EurostatCategory }>;
};

export function eurostatRenUrl(places: readonly string[]): string | null {
  const geos = places.map((place) => GEO[place]);
  if (geos.length === 0 || geos.some((geo) => !geo)) {
    return null;
  }
  const params = new URLSearchParams();
  params.set('lang', 'en');
  params.set('nrg_bal', 'REN');
  params.set('unit', 'PC');
  for (const geo of geos) {
    params.append('geo', geo ?? '');
  }
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_ren?${params}`;
}

export function parseEurostatRen(text: string): SeriesRow[] {
  let body: EurostatBody;
  try {
    body = JSON.parse(text) as EurostatBody;
  } catch {
    return [];
  }
  const ids = body.id ?? [];
  const size = body.size ?? [];
  if (ids.length === 0 || ids.length !== size.length) {
    return [];
  }
  const stride = size.map(() => 1);
  for (let index = size.length - 2; index >= 0; index -= 1) {
    stride[index] = (stride[index + 1] ?? 1) * (size[index + 1] ?? 1);
  }
  const codes = ids.map((id) => invert(body.dimension?.[id]?.category?.index));
  const labels = ids.map((id) => body.dimension?.[id]?.category?.label ?? {});
  const rows: SeriesRow[] = [];
  for (const [key, raw] of Object.entries(body.value ?? {})) {
    const flat = Number(key);
    if (!Number.isFinite(flat) || typeof raw !== 'number' || !Number.isFinite(raw)) {
      continue;
    }
    const coord: Record<string, string> = {};
    ids.forEach((id, index) => {
      const pos = Math.floor(flat / (stride[index] ?? 1)) % (size[index] ?? 1);
      coord[id] = codes[index]?.[pos] ?? '';
    });
    if ((coord.nrg_bal && coord.nrg_bal !== 'REN') || (coord.unit && coord.unit !== 'PC')) {
      continue;
    }
    if (coord.freq && coord.freq !== 'A') {
      continue;
    }
    const year = coord.time ?? '';
    if (!/^(?:19|20)\d{2}$/.test(year)) {
      continue;
    }
    const geo = coord.geo ?? '';
    const geoAt = ids.indexOf('geo');
    const name = (geoAt >= 0 ? labels[geoAt]?.[geo] : '') || nameForGeo(geo);
    if (!name) {
      continue;
    }
    rows.push({ x: year, y: Math.round(raw * 1000) / 1000, series: name });
  }
  rows.sort((a, b) => String(a.x).localeCompare(String(b.x)) || String(a.series).localeCompare(String(b.series)));
  return rows;
}

export function eurostatSnapshot(rows: SeriesRow[]): SeriesRow[] {
  const latest = new Map<string, { year: string; y: number }>();
  for (const row of rows) {
    const name = row.series;
    if (!name) {
      continue;
    }
    const year = String(row.x);
    const prev = latest.get(name);
    if (!prev || year > prev.year) {
      latest.set(name, { year, y: row.y });
    }
  }
  return [...latest.entries()]
    .map(([x, item]) => ({ x, y: item.y }))
    .sort((a, b) => b.y - a.y || a.x.localeCompare(b.x));
}

function invert(index: Record<string, number> | undefined): string[] {
  const codes: string[] = [];
  for (const [code, at] of Object.entries(index ?? {})) {
    codes[at] = code;
  }
  return codes;
}

function nameForGeo(geo: string): string {
  return Object.entries(GEO).find(([, code]) => code === geo)?.[0] ?? '';
}
