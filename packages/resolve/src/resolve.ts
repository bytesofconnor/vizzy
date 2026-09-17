import { matchPrompt } from './catalog';
import { defaultGet } from './http';
import { sinceYearFromAsked } from './normalize';
import { parseFredCsv, fredCsvUrl } from './parse/fred';
import { parseNoaaCo2, NOAA_CO2_URL } from './parse/noaa';
import { OWID_SPEC, OWID_OZONE_URL, owidCsvUrl, parseOwidCsv, parseOwidOzone } from './parse/owid';
import { parseUsgsGeojson, USGS_M8_URL } from './parse/usgs';
import { parseWikiApi, parseWikiUnVotes, wikiParseUrl, WIKI_SPEC } from './parse/wiki';
import { parseWorldBank, worldBankUrl } from './parse/worldbank';
import type { HttpGet, Recipe, ResolvedSeries, SeriesRow } from './types';
import { downsample, windowSince } from './window';

export async function fetchRecipe(
  recipe: Recipe,
  get: HttpGet = defaultGet
): Promise<SeriesRow[]> {
  if (recipe.family === 'fred') {
    return parseFredCsv(await get(fredCsvUrl(recipe.seriesId)));
  }
  if (recipe.family === 'noaa') {
    if (recipe.seriesId === 'ozone_hole_area') {
      return parseOwidOzone(await get(OWID_OZONE_URL));
    }
    return parseNoaaCo2(await get(NOAA_CO2_URL));
  }
  if (recipe.family === 'owid') {
    const spec = OWID_SPEC[recipe.seriesId];
    if (!spec) {
      return [];
    }
    return parseOwidCsv(await get(owidCsvUrl(spec.slug)), spec);
  }
  if (recipe.family === 'usgs') {
    return parseUsgsGeojson(await get(USGS_M8_URL));
  }
  if (recipe.family === 'worldbank') {
    return parseWorldBank(await get(worldBankUrl(recipe.seriesId)), recipe.seriesId === 'EG.ELC.ACCS.ZS' ? 'low' : 'high');
  }
  const spec = WIKI_SPEC[recipe.seriesId];
  if (!spec) {
    return [];
  }
  const body = await get(wikiParseUrl(spec.page));
  if (recipe.seriesId === 'un_votes_ukraine') {
    return parseWikiUnVotes(body);
  }
  return parseWikiApi(body, spec);
}

export async function resolvePrompt(
  asked: string,
  options: { get?: HttpGet; now?: number } = {}
): Promise<ResolvedSeries | null> {
  const recipe = matchPrompt(asked);
  if (!recipe) {
    return null;
  }
  const fetched = await fetchRecipe(recipe, options.get ?? defaultGet);
  const since = sinceYearFromAsked(asked);
  const rows = downsample(windowSince(fetched, since));
  if (rows.length < 2) {
    return null;
  }
  return {
    family: recipe.family,
    seriesId: recipe.seriesId,
    sourceLabel: recipe.sourceLabel,
    sourceUrl: recipe.sourceUrl,
    method: 'official',
    retrieved: options.now ?? Date.now(),
    xLabel: recipe.xLabel,
    yLabel: recipe.yLabel,
    rows,
  };
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
  const header = `| ${series.xLabel} | ${series.yLabel} |`;
  const rule = '| --- | --- |';
  const body = series.rows.map((row) => `| ${row.x} | ${row.y} |`).join('\n');
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
