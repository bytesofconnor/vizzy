import type { ResolvedSeries } from '@vizzy/resolve';
import { fitChartType } from './compose-guards';
import { honestTitle } from './honor-prompt';
import { mintPiece, type MintResult } from './mint';
import { looksLikeInstruction, remixFollowUp } from './remix-prompt';
import { studioChart } from './theme';

const MAX_OFFICIAL_ROWS = 80;

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

const CLASH_WORDS = ['poverty', 'population', 'death', 'pew', 'gallup'] as const;

export function textClashesWithSeries(
  text: string,
  series: { seriesId: string; sourceLabel: string; yLabel: string }
): boolean {
  const fold = text.toLowerCase();
  const identity = `${series.yLabel} ${series.sourceLabel} ${series.seriesId}`.toLowerCase();
  return CLASH_WORDS.some((word) => fold.includes(word) && !identity.includes(word));
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

/** Chart an official series without a drafting model. */
export function mintFromOfficial(asked: string, series: ResolvedSeries): MintResult {
  const rows =
    series.rows.length > MAX_OFFICIAL_ROWS ? series.rows.slice(-MAX_OFFICIAL_ROWS) : series.rows;
  const yearly = yearlyOfficialRows(rows);
  const chartType = fitChartType(yearly ? 'line' : 'bar', rows, asked);
  const title = honestTitle({
    asked,
    title: titleFromAsked(asked, series),
    xLabel: series.xLabel,
    yLabel: series.yLabel,
    rows,
    note: series.sourceLabel,
    sourceLabel: series.sourceLabel,
  });
  const note = textClashesWithSeries(asked, series) ? title : series.sourceLabel;
  const config = studioChart(
    chartType === 'line' ? { type: 'line' } : { type: 'bar', barPadding: 0.32 },
    { x: 'x', y: 'y' },
    {
      axes: {
        x: { label: series.xLabel },
        y: { label: series.yLabel },
      },
      accessibility: {
        title,
        description: series.sourceLabel,
      },
    }
  );

  return mintPiece({
    title,
    kicker: FAMILY_KICKER[series.family],
    note,
    data: rows.map((row) => ({ x: row.x, y: row.y })),
    config,
    source: {
      label: series.sourceLabel,
      url: series.sourceUrl,
      method: 'official',
      retrieved: new Date(series.retrieved).toISOString().slice(0, 10),
      evidence: `Official ${series.family}:${series.seriesId}`,
    },
  });
}
