import type { SeriesRow } from '../types';

type UsgsFeature = {
  properties?: { mag?: number; place?: string; time?: number };
};

type UsgsBody = {
  features?: UsgsFeature[];
};

export function parseUsgsGeojson(text: string): SeriesRow[] {
  let body: UsgsBody;
  try {
    body = JSON.parse(text) as UsgsBody;
  } catch {
    return [];
  }
  const rows: SeriesRow[] = [];
  const seen = new Set<string>();
  for (const feature of body.features ?? []) {
    const mag = feature.properties?.mag;
    const place = feature.properties?.place?.trim();
    if (typeof mag !== 'number' || !Number.isFinite(mag) || !place) {
      continue;
    }
    const time = feature.properties?.time;
    const year = typeof time === 'number' ? new Date(time).getUTCFullYear() : undefined;
    const x = year ? `${place} (${year})` : place;
    if (seen.has(x)) {
      continue;
    }
    seen.add(x);
    rows.push({ x: x.slice(0, 48), y: mag });
    if (rows.length >= 15) {
      break;
    }
  }
  return rows;
}

export const USGS_M8_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2000-01-01&minmagnitude=8&orderby=magnitude&limit=15';
