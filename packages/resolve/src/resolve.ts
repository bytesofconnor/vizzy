import { matchAsked, matchPrompt } from './catalog';
import { defaultGet } from './http';
import { topCountFromAsked, yearSpanFromAsked } from './normalize';
import { labelIsPlace, labelNamesPlace, placesInAsked } from './places';
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
import { EIA_GENERATION_URL, parseEiaGeneration } from './parse/eia';
import { eurostatRenUrl, eurostatSnapshot, parseEurostatRen } from './parse/eurostat';
import { parseUsgsGeojson, USGS_M8_URL } from './parse/usgs';
import { parseWikiUnVotes, readWiki, wikiParseUrl, WIKI_SPEC } from './parse/wiki';
import { parseWorldBank, worldBankUrl } from './parse/worldbank';
import type { HttpGet, Recipe, ResolvedSeries, SeriesRow } from './types';
import { alignGrainLabel, downsample, isTimedRows, rowCap, windowSpan } from './window';

type LoadedRecipe = { rows: SeriesRow[]; snapshotYear?: string; truncatedTo?: number; panel?: boolean };

const RANK_CAP = 15;

function rankLimit(asked?: string): number {
  const askedN = asked ? topCountFromAsked(asked) : undefined;
  if (askedN !== undefined) {
    return askedN;
  }
  return RANK_CAP;
}

function capRanking(rows: SeriesRow[], asked?: string): { rows: SeriesRow[]; truncatedTo?: number } {
  const cap = rankLimit(asked);
  if (rows.length <= cap) {
    return { rows };
  }
  return { rows: rows.slice(0, cap), truncatedTo: cap };
}

async function loadRecipe(
  recipe: Recipe,
  get: HttpGet,
  asked?: string,
  rank: 'asked' | 'all' = 'asked',
  now = Date.now()
): Promise<LoadedRecipe> {
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
    return spec.rank && rank !== 'all' ? capRanking(parsed, asked) : { rows: parsed };
  }
  if (recipe.family === 'usgs') {
    return { rows: parseUsgsGeojson(await get(USGS_M8_URL)) };
  }
  if (recipe.family === 'eia') {
    const span = asked ? yearSpanFromAsked(asked, now) : {};
    const askedYear = span.since !== undefined && span.until === span.since ? span.since : undefined;
    const parsed = parseEiaGeneration(await get(EIA_GENERATION_URL), now, askedYear);
    return {
      rows: parsed.rows,
      ...(parsed.snapshotYear ? { snapshotYear: parsed.snapshotYear } : {}),
    };
  }
  if (recipe.family === 'eurostat') {
    const places = asked ? placesInAsked(asked) : [];
    const url = eurostatRenUrl(places);
    if (!url) {
      return { rows: [] };
    }
    const parsed = parseEurostatRen(await get(url));
    if (asked && wantsCountryPanel(asked)) {
      return keepPanel(parsed, asked);
    }
    const shot = eurostatSnapshot(parsed);
    const ranked = preferAskedCountries(shot.rows, asked);
    return {
      ...ranked,
      ...(shot.year ? { snapshotYear: shot.year } : {}),
    };
  }
  if (recipe.family === 'worldbank') {
    const take = recipe.seriesId === 'EG.ELC.ACCS.ZS' ? 'low' : 'high';
    const panel = Boolean(asked && wantsCountryPanel(asked));
    const span = asked ? yearSpanFromAsked(asked) : {};
    const ranked = parseWorldBank(
      await get(worldBankUrl(recipe.seriesId, panel ? span : undefined)),
      take,
      panel ? 'panel' : 'snapshot'
    );
    if (panel && asked) {
      return keepPanel(ranked, asked);
    }
    if (rank === 'all') {
      return { rows: ranked };
    }
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
  const page = readWiki(body, spec, rankLimit(asked));
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
  const sampled = downsample(kept, rowCap(kept));
  if (matched?.quarterly) {
    return sampled.map(asQuarter);
  }
  return sampled;
}

function asQuarter(row: SeriesRow): SeriesRow {
  const match = String(row.x).trim().match(/^(\d{4})-(\d{2})$/);
  if (!match?.[1] || !match[2]) {
    return row;
  }
  const month = Number(match[2]);
  const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  return { ...row, x: `Q${quarter} ${match[1]}` };
}

function yearOverYear(rows: SeriesRow[]): SeriesRow[] {
  const sorted = [...rows].sort((a, b) => String(a.x).localeCompare(String(b.x)));
  const byStamp = new Map(sorted.map((row) => [String(row.x), row.y]));
  const out: SeriesRow[] = [];
  for (const row of sorted) {
    const match = String(row.x).match(/^(\d{4})-(\d{2})$/);
    if (!match?.[1] || !match[2]) {
      continue;
    }
    const base = byStamp.get(`${Number(match[1]) - 1}-${match[2]}`);
    if (base === undefined || base === 0) {
      continue;
    }
    out.push({ x: String(row.x), y: Math.round(((row.y / base) - 1) * 1000) / 10 });
  }
  return out;
}

function wantsCountryPanel(asked: string): boolean {
  if (placesInAsked(asked).length < 1) {
    return false;
  }
  const span = yearSpanFromAsked(asked);
  return span.since !== undefined || span.until !== undefined;
}

export function seriesCacheKey(family: string, seriesId: string, asked: string): string {
  const version = 'v2';
  if (family !== 'worldbank') {
    return `${version}|${family}|${seriesId}`;
  }
  const panel = wantsCountryPanel(asked);
  const span = yearSpanFromAsked(asked);
  const places = [...placesInAsked(asked)].sort().join(',');
  const top = panel ? '' : String(topCountFromAsked(asked) ?? '');
  const since = panel ? String(span.since ?? '') : '';
  const until = panel ? String(span.until ?? '') : '';
  return `${version}|${family}|${seriesId}|${panel ? 'panel' : 'snapshot'}|${since}|${until}|${places}|${top}`;
}

function keepPanel(rows: SeriesRow[], asked: string): LoadedRecipe {
  const wanted = placesInAsked(asked);
  const picked = rows.filter((row) => wanted.some((entity) => labelIsPlace(row.series ?? '', entity)));
  const covered = wanted.filter((entity) => picked.some((row) => labelIsPlace(row.series ?? '', entity)));
  if (covered.length !== wanted.length) {
    return { rows: [] };
  }
  return { rows: picked, panel: true };
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
  return capRanking(rows, asked);
}

function keepAskedPlaces(rows: SeriesRow[], asked: string): SeriesRow[] {
  if (!rows.some((row) => row.series && labelNamesPlace(row.series))) {
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
  const now = options.now ?? Date.now();
  const loaded = await loadRecipe(recipe, options.get ?? defaultGet, asked, 'asked', now);
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
    retrieved: now,
    xLabel: loaded.panel ? 'Year' : recipe.xLabel,
    yLabel: recipe.yLabel,
    rows: loaded.rows,
    ...(loaded.truncatedTo ? { truncatedTo: loaded.truncatedTo } : {}),
  };
}

const INDEX_TO_RATE = new Set(['CPIAUCSL', 'CPILFESL']);

function comparedName(seriesId: string, asRate: boolean, yLabel: string): string {
  if (asRate) {
    return 'CPI inflation';
  }
  if (seriesId === 'FEDFUNDS') {
    return 'Federal funds rate';
  }
  return yLabel;
}

type ComparedPart = {
  recipe: Recipe;
  rows: SeriesRow[];
  axisLabel: string;
  seriesName: string;
};

function unitFamily(label: string): string {
  const text = label.toLowerCase();
  if (/%|percent|\brate\b|\bshare\b|inflation|yield/.test(text)) {
    return 'percent';
  }
  if (/\$|usd|dollar|per person|per capita|million/.test(text)) {
    return 'money';
  }
  if (/\byears?\b/.test(text)) {
    return 'years';
  }
  if (/\bindex\b/.test(text)) {
    return 'index';
  }
  return text;
}

function comparisonSource(parts: readonly ComparedPart[]): string {
  const families = new Set(parts.map((part) => part.recipe.family));
  const first = parts[0];
  if (families.size === 1 && first?.recipe.family === 'fred') {
    return `FRED — ${parts.map((part) => part.seriesName).join(' and ')}`;
  }
  return parts.map((part) => part.recipe.sourceLabel).join('; ');
}

function sharedLine(parts: readonly ComparedPart[]): SeriesRow[] {
  const shared = new Set(
    (parts[0]?.rows ?? [])
      .map((row) => row.x)
      .filter((x) => parts.every((part) => part.rows.some((row) => row.x === x)))
  );
  const rows = parts.flatMap((part) =>
    part.rows
      .filter((row) => shared.has(row.x))
      .map((row) => ({ ...row, series: part.seriesName }))
  );
  rows.sort((a, b) => String(a.x).localeCompare(String(b.x)) || String(a.series).localeCompare(String(b.series)));
  return rows;
}

function scatterJoin(xPart: ComparedPart, yPart: ComparedPart): SeriesRow[] {
  const yByKey = new Map(yPart.rows.map((row) => [String(row.x), row.y]));
  const rows: SeriesRow[] = [];
  for (const row of xPart.rows) {
    const y = yByKey.get(String(row.x));
    if (y === undefined) {
      continue;
    }
    rows.push({ x: String(row.y), y, series: String(row.x) });
  }
  rows.sort((a, b) => Number(a.x) - Number(b.x) || String(a.series).localeCompare(String(b.series)));
  return rows;
}

function isGdpPerPerson(label: string): boolean {
  return /gdp per capita|gdp per person|usd per person/i.test(label);
}

function isLifeYears(label: string): boolean {
  const text = label.trim();
  return /^years$/i.test(text) || /life expectancy/i.test(text);
}

function scatterAxes(xPart: ComparedPart, yPart: ComparedPart): { x: ComparedPart; y: ComparedPart } {
  if (isLifeYears(xPart.axisLabel) && isGdpPerPerson(yPart.axisLabel)) {
    return { x: yPart, y: xPart };
  }
  return { x: xPart, y: yPart };
}

function lineAxis(parts: readonly ComparedPart[], key: 'x' | 'y'): string {
  if (key === 'x') {
    return parts[0]?.recipe.xLabel ?? 'Time';
  }
  const labels = parts.map((part) => part.axisLabel);
  if (labels.every((label) => unitFamily(label) === 'percent')) {
    return 'Percent';
  }
  return labels[0] ?? 'Value';
}

async function resolveComparison(
  recipes: readonly Recipe[],
  asked: string,
  options: { get?: HttpGet; now?: number }
): Promise<ResolvedSeries | null> {
  const now = options.now ?? Date.now();
  const get = options.get ?? defaultGet;
  const span = yearSpanFromAsked(asked, now);
  const parts: ComparedPart[] = [];
  const missed: string[] = [];
  for (const recipe of recipes) {
    const loaded = await loadRecipe(recipe, get, asked, 'all', now);
    const asRate = INDEX_TO_RATE.has(recipe.seriesId);
    const rows = asRate ? yearOverYear(loaded.rows) : loaded.rows;
    if (rows.length < 2) {
      missed.push(recipe.yLabel);
      continue;
    }
    parts.push({
      recipe,
      rows,
      axisLabel: asRate ? 'Inflation %' : recipe.yLabel,
      seriesName: comparedName(recipe.seriesId, asRate, recipe.yLabel),
    });
  }
  const first = parts[0];
  if (!first) {
    return null;
  }
  if (parts.length === 1) {
    const rows = rowsForAsked(first.rows, asked, now);
    if (rows.length < 2) {
      return null;
    }
    return {
      family: first.recipe.family,
      seriesId: first.recipe.seriesId,
      sourceLabel: first.recipe.sourceLabel,
      sourceUrl: first.recipe.sourceUrl,
      method: 'official',
      retrieved: now,
      xLabel: alignGrainLabel(first.recipe.xLabel, rows),
      yLabel: first.axisLabel,
      rows,
      ...(missed.length > 0 ? { missingSeries: missed.join(', ') } : {}),
    };
  }
  const second = parts[1];
  if (!second) {
    return null;
  }
  const sameUnit = unitFamily(first.axisLabel) === unitFamily(second.axisLabel);
  if (sameUnit) {
    const aligned = parts.map((part) => ({
      ...part,
      rows: rowsForAsked(part.rows, asked, now),
    }));
    const rows = sharedLine(aligned);
    if (rows.length < 2) {
      return null;
    }
    return {
      family: first.recipe.family,
      seriesId: parts.map((part) => part.recipe.seriesId).join('+'),
      sourceLabel: comparisonSource(parts),
      sourceUrl: first.recipe.sourceUrl,
      method: 'official',
      retrieved: now,
      xLabel: alignGrainLabel(lineAxis(parts, 'x'), rows),
      yLabel: lineAxis(parts, 'y'),
      rows,
      chartType: 'line',
    };
  }
  const xRows = windowSpan(first.rows, span);
  const yRows = windowSpan(second.rows, span);
  const oriented = scatterAxes({ ...first, rows: xRows }, { ...second, rows: yRows });
  const rows = scatterJoin(oriented.x, oriented.y);
  if (rows.length < 2) {
    const kept = rowsForAsked(first.rows, asked, now);
    if (kept.length < 2) {
      return null;
    }
    return {
      family: first.recipe.family,
      seriesId: first.recipe.seriesId,
      sourceLabel: first.recipe.sourceLabel,
      sourceUrl: first.recipe.sourceUrl,
      method: 'official',
      retrieved: now,
      xLabel: alignGrainLabel(first.recipe.xLabel, kept),
      yLabel: first.axisLabel,
      rows: kept,
      missingSeries: second.seriesName,
    };
  }
  return {
    family: first.recipe.family,
    seriesId: parts.map((part) => part.recipe.seriesId).join('+'),
    sourceLabel: comparisonSource(parts),
    sourceUrl: first.recipe.sourceUrl,
    method: 'official',
    retrieved: now,
    xLabel: oriented.x.axisLabel,
    yLabel: oriented.y.axisLabel,
    rows,
    chartType: 'scatter',
  };
}

const INFLATION_ASK = /\binflat(?:ion|on)\b/i;

export function presentSeries(series: ResolvedSeries, asked: string): ResolvedSeries {
  if (!INFLATION_ASK.test(asked) || series.rows.some((row) => row.series)) {
    return series;
  }
  const index = INDEX_TO_RATE.has(series.seriesId) || /\b(cpi|price index|index)\b/i.test(series.yLabel);
  const alreadyRate = /%|percent|\brate\b/i.test(series.yLabel);
  if (!index || alreadyRate) {
    return series;
  }
  const rows = yearOverYear(series.rows);
  if (rows.length < 2) {
    return series;
  }
  return { ...series, rows, yLabel: 'YoY %' };
}

export async function resolvePrompt(
  asked: string,
  options: { get?: HttpGet; now?: number } = {}
): Promise<ResolvedSeries | null> {
  const recipes = matchAsked(asked);
  if (recipes.length === 2) {
    return resolveComparison(recipes, asked, options);
  }
  const full = await fetchMatched(asked, options);
  if (!full) {
    return null;
  }
  const shown = presentSeries(full, asked);
  const rows = rowsForAsked(shown.rows, asked, options.now ?? Date.now());
  if (rows.length < 2) {
    return null;
  }
  return { ...shown, rows, xLabel: alignGrainLabel(shown.xLabel, rows) };
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
