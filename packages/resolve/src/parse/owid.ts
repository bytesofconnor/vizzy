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
  /^(world|africa|asia|europe|european union|north america|south america|oceania|latin america|caribbean|middle east|americas|antarctica|high-income|low-income|upper-middle|lower-middle|eu \(27\))/i;

function skipEntity(entity: string): boolean {
  return (
    SKIP_ENTITY.test(entity) ||
    /\((fao|un m49|who|wb)\)/i.test(entity) ||
    /^all /i.test(entity) ||
    /^\(/i.test(entity) ||
    /population-weighted/i.test(entity)
  );
}

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
  forest_share: {
    slug: 'forest-area-as-share-of-land-area',
    value: /^Share of land covered by forest$/i,
    rank: true,
  },
  deforestation: {
    slug: 'annual-deforestation',
    value: /^Deforestation$/i,
    rank: true,
  },
  tree_cover_loss: {
    slug: 'tree-cover-loss',
    value: /^Total$/i,
    rank: true,
  },
  terrestrial_protected: {
    slug: 'terrestrial-protected-areas',
    value: /Terrestrial protected areas/i,
    rank: true,
  },
  marine_protected: {
    slug: 'marine-protected-areas',
    value: /Marine protected areas/i,
    rank: true,
  },
  living_planet_index: {
    slug: 'living-planet-index-by-region',
    value: /^Living Planet Index$/i,
    entity: 'World',
  },
  fish_overexploited: {
    slug: 'fish-stocks-within-sustainable-levels',
    value: /^Overexploited$/i,
    entity: 'World',
  },
  population_density: {
    slug: 'population-density',
    value: /^Population density$/i,
    rank: true,
  },
  plastic_ocean: {
    slug: 'plastic-waste-emitted-to-the-ocean',
    value: /Plastic waste emitted to the ocean/i,
    rank: true,
  },
  world_population: {
    slug: 'population',
    value: /^Population$/i,
    entity: 'World',
  },
  conflict_deaths: {
    slug: 'deaths-in-state-based-conflicts',
    value: /^Best estimate$/i,
    entity: 'World',
  },
  child_mortality: {
    slug: 'child-mortality',
    value: /Under-five mortality/i,
    entity: 'World',
  },
  extreme_poverty: {
    slug: 'share-of-population-in-extreme-poverty',
    value: /Share of population in poverty/i,
    entity: 'World',
  },
  literacy_rate: {
    slug: 'cross-country-literacy-rates',
    value: /^Literacy rate$/i,
    entity: 'World',
  },
  democracy_index: {
    slug: 'electoral-democracy-index',
    value: /^Electoral democracy index$/i,
    entity: 'World',
  },
  countries_count: {
    slug: 'number-of-countries',
    value: /Gleditsch and Ward/i,
    entity: 'World',
  },
  urban_share: {
    slug: 'share-of-population-urban',
    value: /^Urban$/i,
    entity: 'World',
  },
  world_gdp: {
    slug: 'global-gdp-over-the-long-run',
    value: /^GDP$/i,
    entity: 'World',
  },
  nuclear_warheads: {
    slug: 'nuclear-warhead-inventories',
    value: /Deployed strategic warheads/i,
    rank: true,
  },
  transistors: {
    slug: 'transistors-per-microprocessor',
    value: /Transistors per microprocessor/i,
    entity: 'World',
  },
  nitrogen_fertilizer: {
    slug: 'fertilizer-production-by-nutrient-type-npk',
    value: /^Nitrogen$/i,
    entity: 'World',
  },
  tuberculosis_deaths: {
    slug: 'tuberculosis-death-rate',
    value: /tuberculosis/i,
    entity: 'World',
  },
  described_species: {
    slug: 'number-of-described-species',
    value: /Number of described species/i,
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
      .filter((row) => row.year === year && !skipEntity(row.entity) && row.entity.length <= 40)
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
