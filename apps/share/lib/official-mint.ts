import { checkAnswer, DATASETS, phraseIn, rowsForAsked, titleClaimsMissing, yearSpanFromAsked, type ResolvedSeries } from '@vizzy/resolve';
import { drawnYearSpan, spanLabel, withDrawnSpan } from './year-span';
import { fitChartType } from './compose-guards';
import { honestTitle, withTopCount } from './honor-prompt';
import { mintPiece, type MintResult } from './mint';
import { looksLikeInstruction, remixFollowUp } from './remix-prompt';
import { sourceMethodFor } from './source';
import { chartDrawnWords, spellTitleFromResolved } from './title-spelling';
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

function disclose(text: string, asked: string, coverage: string | undefined): string {
  if (!coverage) {
    return text;
  }
  if (`${asked} ${text}`.toLowerCase().includes(coverage.toLowerCase())) {
    return text;
  }
  return `${text}, ${coverage}`;
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
  const spanned = series.chartType === 'scatter' ? series.rows : rowsForAsked(series.rows, asked, series.retrieved);
  const cut = series.chartType === 'scatter' ? null : applyYearlyCut(asked, spanned);
  const rows = cut ?? spanned;
  const multi = new Set(rows.map((row) => row.series).filter(Boolean)).size >= 2;
  const yearly = yearlyOfficialRows(rows);
  const chartType = series.chartType ?? (multi ? 'line' : fitChartType(yearly ? 'line' : 'bar', rows, asked));
  const xLabel = cut ? 'Year' : series.xLabel;
  const yLabel = capitalizeUnits(
    cut && wantsYearlyChange(asked) && !/^change in /i.test(series.yLabel)
      ? `Change in ${series.yLabel}`
      : series.yLabel
  );
  const titled = { ...series, rows, xLabel, yLabel };
  const dataset = DATASETS.find((item) => item.family === series.family && item.seriesId === series.seriesId);
  const answered = checkAnswer(asked, {
    title: titleFromAsked(asked, titled),
    chartType,
    xLabel,
    yLabel,
    sourceLabel: series.sourceLabel,
    seriesId: series.seriesId,
    rows,
  });
  if (!answered.ok && (answered.code === 'metric' || answered.code === 'composition' || answered.code === 'units')) {
    return { ok: false, error: answered.detail, issues: [] };
  }
  const gapTitle = series.missingSeries ? `${yLabel}. Not shown: ${series.missingSeries}.` : undefined;
  const askedTitle = titleFromAsked(asked, titled);
  const faceTitle =
    gapTitle ??
    (!answered.ok &&
    (answered.code === 'entity' || answered.code === 'series') &&
    titleClaimsMissing(askedTitle, answered.detail)
      ? answered.honestTitle
      : askedTitle);
  const spelled = withTopCount(
    spellTitleFromResolved(
      titleWithSnapshotYear(
        honestTitle({
          asked,
          title: faceTitle,
          xLabel,
          yLabel,
          rows,
          note: series.sourceLabel,
          sourceLabel: series.sourceLabel,
        }),
        series.sourceLabel
      ),
      {
        drawn: chartDrawnWords([xLabel, yLabel], rows),
        also: [series.sourceLabel, ...(dataset?.aliases ?? [])],
      }
    ),
    series.truncatedTo
  );
  const title = withDrawnSpan(disclose(spelled, asked, dataset?.coverage), rows);
  const shortfall = coverageShortfall(asked, rows, series.retrieved);
  const subtitle = seriesSubtitle(yLabel, rows, shortfall);
  const note = seriesNote(
    disclose(textClashesWithSeries(asked, series) ? title : series.sourceLabel, asked, dataset?.coverage),
    yLabel,
    rows,
    shortfall
  );
  const config = studioChart(
    chartType === 'line'
      ? { type: 'line' }
      : chartType === 'scatter'
        ? { type: 'scatter' }
        : { type: 'bar', barPadding: 0.32 },
    { x: 'x', y: 'y', ...(chartType === 'line' && multi ? { color: 'series' as const } : {}) },
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
    subtitle,
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
    },
  });
}

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function capitalizeUnits(label: string): string {
  return label.replace(/\b(usd|eur|gbp|jpy|cny|aud|cad)\b/gi, (token) => token.toUpperCase());
}

type Dated = { year: number; month?: number };

function datedRow(value: string | number): Dated | undefined {
  const text = String(value).trim();
  const iso = text.match(/^((?:1[89]|20)\d{2})-(\d{2})(?:$|[-/.])/);
  if (iso?.[1] && iso[2]) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) {
      return { year: Number(iso[1]), month };
    }
  }
  const quarter = text.match(/^(?:q([1-4])\s+((?:1[89]|20)\d{2})|((?:1[89]|20)\d{2})-q([1-4]))$/i);
  if (quarter) {
    const q = Number(quarter[1] || quarter[4]);
    const year = Number(quarter[2] || quarter[3]);
    if (q >= 1 && q <= 4 && year) {
      return { year, month: q * 3 };
    }
  }
  const year = text.match(/^((?:1[89]|20)\d{2})$/);
  return year?.[1] ? { year: Number(year[1]) } : undefined;
}

function datedKey(stamp: Dated, edge: 'start' | 'end'): number {
  const month = stamp.month ?? (edge === 'start' ? 1 : 12);
  return stamp.year * 12 + month;
}

function datedLabel(stamp: Dated): string {
  return stamp.month ? `${FULL_MONTHS[stamp.month - 1]} ${stamp.year}` : String(stamp.year);
}

function coverageShortfall(
  asked: string,
  rows: Array<{ x: string | number }>,
  now: number
): string | null {
  const span = yearSpanFromAsked(asked, now);
  if (span.since === undefined && span.until === undefined) {
    return null;
  }
  const stamps = rows
    .map((row) => datedRow(row.x))
    .filter((stamp): stamp is Dated => stamp !== undefined)
    .sort((left, right) => datedKey(left, 'start') - datedKey(right, 'start'));
  const start = stamps[0];
  const end = stamps[stamps.length - 1];
  if (!start || !end || stamps.length < Math.ceil(rows.length * 0.7)) {
    return null;
  }
  const bits: string[] = [];
  if (span.since !== undefined) {
    const askedStart = span.since * 12 + (span.sinceMonth ?? 1);
    if (datedKey(start, 'start') > askedStart) {
      const wanted = span.sinceMonth ? `${FULL_MONTHS[span.sinceMonth - 1]} ${span.since}` : String(span.since);
      bits.push(`Starts in ${datedLabel(start)}, not ${wanted}`);
    }
  }
  if (span.until !== undefined) {
    const askedEnd = span.until * 12 + (span.untilMonth ?? 12);
    if (datedKey(end, 'end') < askedEnd) {
      const wanted = span.untilMonth ? `${FULL_MONTHS[span.untilMonth - 1]} ${span.until}` : String(span.until);
      bits.push(`Ends in ${datedLabel(end)}, short of ${wanted}`);
    }
  } else if (span.since !== undefined && end.year < new Date(now).getUTCFullYear() - 1) {
    bits.push(`Ends in ${end.year}, short of ${new Date(now).getUTCFullYear()}`);
  }
  return bits.length > 0 ? `${bits.join('. ')}.` : null;
}

function seriesSubtitle(
  yLabel: string,
  rows: Array<{ x: string | number }>,
  shortfall: string | null
): string {
  const span = drawnYearSpan(rows);
  const lead = [capitalizeUnits(yLabel), span ? spanLabel(span) : ''].filter(Boolean).join(', ');
  if (!shortfall) {
    return lead;
  }
  return lead ? `${lead}. ${shortfall}` : shortfall;
}

function seriesNote(
  base: string,
  yLabel: string,
  rows: Array<{ x: string | number }>,
  shortfall: string | null
): string {
  const lead = seriesSubtitle(yLabel, rows, null);
  let note = lead ? `${lead}. ${base}` : base;
  if (shortfall && !note.includes(shortfall)) {
    note = `${note} ${shortfall}`;
  }
  if (note.trim() === base.trim()) {
    return `${base}.`;
  }
  return note;
}
