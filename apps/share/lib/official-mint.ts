import { phraseIn, rowsForAsked, type ResolvedSeries } from '@vizzy/resolve';
import { withDrawnSpan } from './year-span';
import { fitChartType } from './compose-guards';
import { honestTitle } from './honor-prompt';
import { mintPiece, type MintResult } from './mint';
import { looksLikeInstruction, remixFollowUp } from './remix-prompt';
import { sourceMethodFor } from './source';
import { spellTitleFromResolved } from './title-spelling';
import { studioChart } from './theme';

const FAMILY_KICKER: Record<ResolvedSeries['family'], string> = {
  noaa: 'NOAA',
  usgs: 'USGS',
  fred: 'FRED',
  owid: 'Our World in Data',
  worldbank: 'World Bank',
  wiki: 'Wikipedia',
};

export function yearlyOfficialRows(rows: ResolvedSeries['rows']): boolean {
  if (rows.length < 2) {
    return false;
  }
  const years = rows.filter((row) => /^(?:19|20)\d{2}$/.test(String(row.x).trim())).length;
  return years >= Math.ceil(rows.length * 0.7);
}

const YEARLY_GRAIN = /\b(per year|each year|every year|by year|year by year|yearly|annually|annual)\b/i;
const YEARLY_CHANGE = /\b(year-over-year|year to year|yoy)\b/i;
const CHANGE_WORD = /\b(changes?|delta|difference)\b/i;
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

function wantsYearlyChange(asked: string): boolean {
  return YEARLY_CHANGE.test(asked) || (CHANGE_WORD.test(asked) && YEARLY_GRAIN.test(asked));
}

function wantsYearlyGrain(asked: string): boolean {
  return wantsYearlyChange(asked) || YEARLY_GRAIN.test(asked);
}

function monthStamp(value: string): { year: number; month: number } | null {
  const text = value.trim();
  const iso = text.match(/^((?:19|20)\d{2})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) {
      return { year: Number(iso[1]), month };
    }
  }
  const named = text.match(/^([A-Za-z]+)\s+((?:19|20)\d{2})$/);
  if (!named) {
    return null;
  }
  const month = MONTH_NAMES.findIndex((item) => named[1]!.toLowerCase().startsWith(item));
  if (month < 0) {
    return null;
  }
  return { year: Number(named[2]), month: month + 1 };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function yearlyLevels(rows: Array<{ x: string | number; y: number }>): Array<{ year: number; y: number }> {
  const byYear = new Map<number, number>();
  for (const row of rows) {
    const stamp = monthStamp(String(row.x));
    if (!stamp || !Number.isFinite(row.y)) {
      continue;
    }
    byYear.set(stamp.year, row.y);
  }
  return [...byYear.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, y]) => ({ year, y }));
}

function applyYearlyCut(asked: string, rows: ResolvedSeries['rows']): Array<{ x: string; y: number }> | null {
  if (!wantsYearlyGrain(asked) || rows.length < 2) {
    return null;
  }
  const monthlyCount = rows.filter((row) => monthStamp(String(row.x))).length;
  const monthly = monthlyCount >= Math.ceil(rows.length * 0.7);
  let levels: Array<{ year: number; y: number }>;
  if (monthly) {
    levels = yearlyLevels(rows);
  } else if (wantsYearlyChange(asked) && yearlyOfficialRows(rows)) {
    levels = rows
      .map((row) => ({ year: Number(String(row.x).trim()), y: row.y }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.y));
  } else {
    return null;
  }
  if (levels.length < 2) {
    return null;
  }
  if (!wantsYearlyChange(asked)) {
    return levels.map((level) => ({ x: String(level.year), y: round3(level.y) }));
  }
  const deltas: Array<{ x: string; y: number }> = [];
  for (let index = 1; index < levels.length; index += 1) {
    const current = levels[index]!;
    const previous = levels[index - 1]!;
    deltas.push({ x: String(current.year), y: round3(current.y - previous.y) });
  }
  return deltas.length >= 2 ? deltas : null;
}

const CLASH_WORDS = ['poverty', 'population', 'death', 'pew', 'gallup'] as const;
const POLES = ['arctic', 'antarctic'] as const;

export function textClashesWithSeries(
  text: string,
  series: { seriesId: string; sourceLabel: string; yLabel: string }
): boolean {
  const fold = text.toLowerCase();
  const identity = `${series.yLabel} ${series.sourceLabel} ${series.seriesId}`.toLowerCase();
  if (CLASH_WORDS.some((word) => fold.includes(word) && !identity.includes(word))) {
    return true;
  }
  return POLES.some((pole) => phraseIn(fold, pole) && !phraseIn(identity, pole));
}

export function honestSeriesTitle(series: {
  seriesId: string;
  sourceLabel: string;
  rows?: Array<{ x: string | number }>;
}): string {
  if (series.seriesId === 'world_population') {
    return 'World population';
  }
  if (series.seriesId === 'atlantic_hurricanes') {
    const rows = series.rows ?? [];
    const first = rows.find((row) => /^-?\d+$/.test(String(row.x).trim()))?.x ?? rows[0]?.x;
    return `Atlantic storm counts since ${first ?? '1851'}`;
  }
  return series.sourceLabel;
}

function titleWithSnapshotYear(title: string, sourceLabel: string): string {
  if (/\b(?:19|20)\d{2}\b/.test(title)) {
    return title;
  }
  const years = [...new Set([...sourceLabel.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]))];
  if (years.length !== 1) {
    return title;
  }
  return `${title}, ${years[0]}`;
}

export function titleFromAsked(asked: string, series: ResolvedSeries): string {
  if (textClashesWithSeries(asked, series)) {
    return honestSeriesTitle(series);
  }
  const follow = remixFollowUp(asked);
  const line = (follow === null ? asked : follow).split('\n')[0]?.trim() ?? '';
  const cleaned = line.replace(/\s+/g, ' ').replace(/[?.!]+$/g, '');
  if (looksLikeInstruction(cleaned) || cleaned.length < 12) {
    return `${series.yLabel} by ${series.xLabel}`;
  }
  if (cleaned.length > 90) {
    return `${cleaned.slice(0, 87).trim()}…`;
  }
  return cleaned;
}

export function mintFromOfficial(asked: string, series: ResolvedSeries): MintResult {
  const spanned = rowsForAsked(series.rows, asked);
  const cut = applyYearlyCut(asked, spanned);
  const rows = cut ?? spanned;
  const multi = new Set(rows.map((row) => row.series).filter(Boolean)).size >= 2;
  const yearly = yearlyOfficialRows(rows);
  const chartType = multi ? 'line' : fitChartType(yearly ? 'line' : 'bar', rows, asked);
  const xLabel = cut ? 'Year' : series.xLabel;
  const yLabel =
    cut && wantsYearlyChange(asked) && !/^change in /i.test(series.yLabel)
      ? `Change in ${series.yLabel}`
      : series.yLabel;
  const titled = { ...series, rows, xLabel, yLabel };
  const title = spellTitleFromResolved(
    titleWithSnapshotYear(
      honestTitle({
        asked,
        title: titleFromAsked(asked, titled),
        xLabel,
        yLabel,
        rows,
        note: series.sourceLabel,
        sourceLabel: series.sourceLabel,
      }),
      series.sourceLabel
    ),
    { rows, labels: [yLabel, series.sourceLabel] }
  );
  const note = withDrawnSpan(textClashesWithSeries(asked, series) ? title : series.sourceLabel, rows);
  const config = studioChart(
    chartType === 'line' ? { type: 'line' } : { type: 'bar', barPadding: 0.32 },
    { x: 'x', y: 'y', ...(multi ? { color: 'series' as const } : {}) },
    {
      axes: {
        x: { label: xLabel },
        y: { label: yLabel },
      },
      accessibility: {
        title,
        description: series.sourceLabel,
      },
    }
  );

  const method = sourceMethodFor(series.sourceUrl, series.method);
  return mintPiece({
    title,
    kicker: FAMILY_KICKER[series.family],
    note,
    data: rows.map((row) => ({
      x: row.x,
      y: row.y,
      ...(row.series ? { series: row.series } : {}),
    })),
    config,
    source: {
      label: series.sourceLabel,
      url: series.sourceUrl,
      method,
      retrieved: new Date(series.retrieved).toISOString().slice(0, 10),
      evidence: method === 'official' ? `Official ${series.family}:${series.seriesId}` : `${series.family}:${series.seriesId}`,
    },
  });
}
