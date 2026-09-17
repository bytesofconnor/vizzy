import type { ResolvedSeries } from '@vizzy/resolve';
import { mintPiece, type MintResult } from './mint';
import { remixFollowUp } from './remix-prompt';
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

export function titleFromAsked(asked: string, series: ResolvedSeries): string {
  const follow = remixFollowUp(asked);
  const line = (follow === null ? asked : follow).split('\n')[0]?.trim() ?? '';
  const cleaned = line.replace(/\s+/g, ' ').replace(/[?.!]+$/g, '');
  if (cleaned.length >= 12 && cleaned.length <= 90) {
    return cleaned;
  }
  if (cleaned.length > 90) {
    return `${cleaned.slice(0, 87).trim()}…`;
  }
  return `${series.yLabel} by ${series.xLabel}`;
}

/** Chart an official series without a drafting model. */
export function mintFromOfficial(asked: string, series: ResolvedSeries): MintResult {
  const rows =
    series.rows.length > MAX_OFFICIAL_ROWS ? series.rows.slice(-MAX_OFFICIAL_ROWS) : series.rows;
  const yearly = yearlyOfficialRows(rows);
  const title = titleFromAsked(asked, series);
  const config = studioChart(
    yearly ? { type: 'line' } : { type: 'bar', barPadding: 0.32 },
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
    note: series.sourceLabel,
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
