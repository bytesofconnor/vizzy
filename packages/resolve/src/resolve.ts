import { matchPrompt } from './catalog';
import { defaultGet } from './http';
import { yearSpanFromAsked } from './normalize';
import { placesInAsked } from './places';
import { fredCsvUrl, monthlyClose, parseFredCsv } from './parse/fred';
import { parseNoaaCo2, NOAA_CO2_URL, NOAA_CH4_URL } from './parse/noaa';
import { OWID_SPEC, OWID_OZONE_URL, owidCsvUrl, parseOwidCsv, parseOwidOzone } from './parse/owid';
import { parseUsgsGeojson, USGS_M8_URL } from './parse/usgs';
import { parseWikiApi, parseWikiUnVotes, wikiParseUrl, wikiSnapshotYear, WIKI_SPEC } from './parse/wiki';
import { parseWorldBank, worldBankUrl } from './parse/worldbank';
import type { HttpGet, Recipe, ResolvedSeries, SeriesRow } from './types';
import { downsample, rowCap, windowSpan } from './window';

type LoadedRecipe = { rows: SeriesRow[]; snapshotYear?: string };

async function loadRecipe(recipe: Recipe, get: HttpGet): Promise<LoadedRecipe> {
  if (recipe.family === 'fred') {
    const csv = await get(fredCsvUrl(recipe.seriesId));
    return { rows: recipe.rollup === 'month' ? monthlyClose(csv) : parseFredCsv(csv) };
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
    return { rows: parseOwidCsv(await get(owidCsvUrl(spec.slug)), spec) };
  }
  if (recipe.family === 'usgs') {
    return { rows: parseUsgsGeojson(await get(USGS_M8_URL)) };
  }
  if (recipe.family === 'worldbank') {
    return {
      rows: parseWorldBank(await get(worldBankUrl(recipe.seriesId)), recipe.seriesId === 'EG.ELC.ACCS.ZS' ? 'low' : 'high'),
    };
  }
  const spec = WIKI_SPEC[recipe.seriesId];
  if (!spec) {
    return { rows: [] };
  }
  const body = await get(wikiParseUrl(spec.page));
  if (recipe.seriesId === 'un_votes_ukraine') {
    return { rows: parseWikiUnVotes(body) };
  }
  return { rows: parseWikiApi(body, spec), snapshotYear: wikiSnapshotYear(body, spec) };
}

export async function fetchRecipe(
  recipe: Recipe,
  get: HttpGet = defaultGet
): Promise<SeriesRow[]> {
  return (await loadRecipe(recipe, get)).rows;
}

export function rowsForAsked(rows: SeriesRow[], asked: string, now = Date.now()): SeriesRow[] {
  let span = yearSpanFromAsked(asked, now);
  if (span.since === undefined && span.until === undefined) {
    const recent = matchPrompt(asked)?.recentYears;
    if (recent) {
      span = { since: new Date(now).getUTCFullYear() - recent };
    }
  }
  const kept = keepAskedPlaces(windowSpan(rows, span), asked);
  return downsample(kept, rowCap(kept));
}

function keepAskedPlaces(rows: SeriesRow[], asked: string): SeriesRow[] {
  if (!rows.some((row) => row.series)) {
    return rows;
  }
  const wanted = new Set(placesInAsked(asked));
  if (wanted.size === 0) {
    return [];
  }
  return rows.filter((row) => row.series !== undefined && wanted.has(row.series));
}

export async function fetchMatched(
  asked: string,
  options: { get?: HttpGet; now?: number } = {}
): Promise<ResolvedSeries | null> {
  const recipe = matchPrompt(asked);
  if (!recipe) {
    return null;
  }
  const loaded = await loadRecipe(recipe, options.get ?? defaultGet);
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
