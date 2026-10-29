import { matchPrompt } from './catalog';
import { defaultGet } from './http';
import { yearSpanFromAsked } from './normalize';
import { labelIsPlace, placesInAsked } from './places';
import {
  fredCsvUrl,
  monthlyClose,
  parseFredAnnual,
  parseFredCsv,
  parseFredLatestColumns,
  stateUnemploymentUrls,
} from './parse/fred';
import { parseNoaaCo2, NOAA_CO2_URL, NOAA_CH4_URL } from './parse/noaa';
import { OWID_SPEC, OWID_OZONE_URL, owidCsvUrl, parseOwidCsv, parseOwidOzone } from './parse/owid';
import { parseUsgsGeojson, USGS_M8_URL } from './parse/usgs';
import { parseWikiUnVotes, readWiki, wikiParseUrl, WIKI_SPEC } from './parse/wiki';
import { parseWorldBank, worldBankUrl } from './parse/worldbank';
import type { HttpGet, Recipe, ResolvedSeries, SeriesRow } from './types';
import { downsample, isTimedRows, rowCap, windowSpan } from './window';

type LoadedRecipe = { rows: SeriesRow[]; snapshotYear?: string; truncatedTo?: number };

const RANK_CAP = 15;

function capRanking(rows: SeriesRow[]): { rows: SeriesRow[]; truncatedTo?: number } {
  if (rows.length <= RANK_CAP) {
    return { rows };
  }
  return { rows: rows.slice(0, RANK_CAP), truncatedTo: RANK_CAP };
}

async function loadRecipe(recipe: Recipe, get: HttpGet, asked?: string): Promise<LoadedRecipe> {
  if (recipe.family === 'fred') {
    if (recipe.seriesId === 'state_unemployment') {
      const files = await Promise.all(stateUnemploymentUrls().map((url) => get(url)));
      const rows = files.flatMap((csv) => parseFredLatestColumns(csv));
      rows.sort((a, b) => b.y - a.y || String(a.x).localeCompare(String(b.x)));
      return { rows };
    }
    const csv = await get(fredCsvUrl(recipe.seriesId));
    if (recipe.annual) {
      return { rows: parseFredAnnual(csv) };
    }
    return { rows: recipe.monthlyClose ? monthlyClose(csv) : parseFredCsv(csv) };
  }
  if (recipe.family === 'noaa') {
    if (recipe.seriesId === 'ozone_hole_area') {
      return { rows: parseOwidOzone(await get(OWID_OZONE_URL)) };
    }
    if (recipe.seriesId === 'ch4_annmean_gl') {
      return { rows: parseNoaaCo2(await get(NOAA_CH4_URL)) };
    }
    return { rows: parseNoaaCo2(await get(NOAA_CO2_URL)) };
  }
  if (recipe.family === 'owid') {
    const spec = OWID_SPEC[recipe.seriesId];
    if (!spec) {
      return { rows: [] };
    }
    const parsed = parseOwidCsv(await get(owidCsvUrl(spec.slug)), spec);
    return spec.rank ? capRanking(parsed) : { rows: parsed };
  }
  if (recipe.family === 'usgs') {
    return { rows: parseUsgsGeojson(await get(USGS_M8_URL)) };
  }
  if (recipe.family === 'worldbank') {
    const take = recipe.seriesId === 'EG.ELC.ACCS.ZS' ? 'low' : 'high';
    const ranked = parseWorldBank(await get(worldBankUrl(recipe.seriesId)), take);
    return preferAskedCountries(ranked, asked);
  }
  const spec = WIKI_SPEC[recipe.seriesId];
  if (!spec) {
    return { rows: [] };
  }
  const body = await get(wikiParseUrl(spec.page));
  if (recipe.seriesId === 'un_votes_ukraine') {
    return { rows: parseWikiUnVotes(body) };
  }
  const page = readWiki(body, spec);
  return {
    rows: page.rows,
    ...(page.snapshotYear ? { snapshotYear: page.snapshotYear } : {}),
    ...(page.truncatedTo ? { truncatedTo: page.truncatedTo } : {}),
  };
}

export async function fetchRecipe(
  recipe: Recipe,
  get: HttpGet = defaultGet
): Promise<SeriesRow[]> {
  return (await loadRecipe(recipe, get)).rows;
}

export function rowsForAsked(rows: SeriesRow[], asked: string, now = Date.now()): SeriesRow[] {
  const matched = matchPrompt(asked);
  let span = yearSpanFromAsked(asked, now);
  if (span.since === undefined && span.until === undefined && matched?.recentYears) {
    span = { since: new Date(now).getUTCFullYear() - matched.recentYears };
  }
  const kept = keepAskedPlaces(windowSpan(rows, span), asked);
  if (!isTimedRows(kept)) {
    return kept;
  }
  return downsample(kept, rowCap(kept));
}

function preferAskedCountries(rows: SeriesRow[], asked?: string): { rows: SeriesRow[]; truncatedTo?: number } {
  const wanted = asked ? placesInAsked(asked) : [];
  if (wanted.length > 0) {
    const picked = rows.filter((row) => wanted.some((entity) => labelIsPlace(String(row.x), entity)));
    const covered = wanted.filter((entity) => picked.some((row) => labelIsPlace(String(row.x), entity)));
    if (covered.length !== wanted.length) {
      return { rows: [] };
    }
    return { rows: picked };
  }
  return capRanking(rows);
}

function keepAskedPlaces(rows: SeriesRow[], asked: string): SeriesRow[] {
  if (!rows.some((row) => row.series)) {
    return rows;
  }
  const wanted = placesInAsked(asked);
  if (wanted.length === 0) {
    return [];
  }
  return rows.filter(
    (row) => row.series !== undefined && wanted.some((entity) => labelIsPlace(row.series ?? '', entity))
  );
}

export async function fetchMatched(
  asked: string,
  options: { get?: HttpGet; now?: number } = {}
): Promise<ResolvedSeries | null> {
  const recipe = matchPrompt(asked);
  if (!recipe) {
    return null;
  }
  const loaded = await loadRecipe(recipe, options.get ?? defaultGet, asked);
  if (loaded.rows.length < 2) {
    return null;
  }
  const sourceLabel =
    loaded.snapshotYear && !recipe.sourceLabel.includes(loaded.snapshotYear)
      ? `${recipe.sourceLabel}, ${loaded.snapshotYear}`
      : recipe.sourceLabel;
  return {
    family: recipe.family,
    seriesId: recipe.seriesId,
    sourceLabel,
    sourceUrl: recipe.sourceUrl,
    method: 'official',
    retrieved: options.now ?? Date.now(),
    xLabel: recipe.xLabel,
    yLabel: recipe.yLabel,
    rows: loaded.rows,
    ...(loaded.truncatedTo ? { truncatedTo: loaded.truncatedTo } : {}),
  };
}

export async function resolvePrompt(
  asked: string,
  options: { get?: HttpGet; now?: number } = {}
): Promise<ResolvedSeries | null> {
  const full = await fetchMatched(asked, options);
  if (!full) {
    return null;
  }
  const rows = rowsForAsked(full.rows, asked, options.now ?? Date.now());
  if (rows.length < 2) {
    return null;
  }
  return { ...full, rows };
}

export function notesFromResolved(series: {
  family: string;
  seriesId: string;
  sourceLabel: string;
  sourceUrl: string;
  retrieved: number;
  xLabel: string;
  yLabel: string;
  rows: SeriesRow[];
}): string {
  const multi = series.rows.some((row) => row.series);
  const header = multi
    ? `| ${series.xLabel} | Series | ${series.yLabel} |`
    : `| ${series.xLabel} | ${series.yLabel} |`;
  const rule = multi ? '| --- | --- | --- |' : '| --- | --- |';
  const body = series.rows
    .map((row) => (multi ? `| ${row.x} | ${row.series ?? ''} | ${row.y} |` : `| ${row.x} | ${row.y} |`))
    .join('\n');
  const retrieved = new Date(series.retrieved).toISOString().slice(0, 10);
  return [
    `Official series ${series.family}:${series.seriesId}. Chart these numbers. Do not invent a different table.`,
    `sourceMethod official. sourceLabel: ${series.sourceLabel}. URL: ${series.sourceUrl}. retrieved ${retrieved}.`,
    '',
    header,
    rule,
    body,
  ].join('\n');
}
