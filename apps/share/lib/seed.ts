import type { MintInput } from './mint';
import type { Piece } from './pieces';

export type ChartSeed = {
  title: string;
  kicker: string;
  note: string;
  chartType: 'bar' | 'line' | 'scatter';
  area: boolean;
  xLabel: string;
  yLabel: string;
  sourceLabel: string;
  sourceMethod: 'official' | 'export' | 'scraped' | 'estimate' | 'manual' | 'example' | 'unknown';
  evidence: string;
  sourceUrl?: string;
  printGrayscale?: boolean;
  rows: Array<{ x: string | number; y: number; series?: string }>;
};

const METHODS = ['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown'] as const;

function seriesField(mapping: Piece['config']['dataMapping']): string | undefined {
  if (mapping.color && mapping.color !== 'tone') {
    return mapping.color;
  }
  return mapping.group;
}

export function seedFromPiece(piece: Piece): ChartSeed {
  const xField = piece.config.dataMapping.x;
  const yField = piece.config.dataMapping.y;
  const groupField = seriesField(piece.config.dataMapping);
  const source = piece.config.source;
  const method = METHODS.find((item) => item === source?.method) ?? 'unknown';
  const rows = piece.data
    .map((row) => {
      const y = Number(row[yField]);
      const series = groupField ? String(row[groupField] ?? '').trim() : '';
      return {
        x: row[xField] as string | number,
        y,
        ...(series ? { series } : {}),
      };
    })
    .filter((row) => Number.isFinite(row.y));

  return {
    title: piece.title,
    kicker: piece.kicker,
    note: piece.note,
    chartType: piece.config.chart.type === 'line' || piece.config.chart.type === 'scatter' ? piece.config.chart.type : 'bar',
    area: piece.config.chart.type === 'line' ? Boolean(piece.config.chart.area) : false,
    xLabel: piece.config.axes?.x?.label ?? 'Category',
    yLabel: piece.config.axes?.y?.label ?? 'Value',
    sourceLabel: source?.label ?? 'Unspecified',
    sourceMethod: method,
    evidence: source?.evidence ?? '',
    sourceUrl: source?.url,
    printGrayscale: piece.printGrayscale ?? false,
    rows,
  };
}

export function mintInputFromSeed(seed: ChartSeed, overrides?: { printGrayscale?: boolean }): MintInput {
  const grouped = seed.rows.some((row) => Boolean(row.series));
  return {
    title: seed.title,
    kicker: seed.kicker,
    note: seed.note,
    data: seed.rows.map((row) => ({
      x: row.x,
      y: row.y,
      ...(row.series ? { series: row.series } : {}),
    })),
    source: {
      label: seed.sourceLabel,
      method: seed.sourceMethod,
      evidence: seed.evidence,
      ...(seed.sourceUrl ? { url: seed.sourceUrl } : {}),
    },
    config: {
      chart: {
        type: seed.chartType,
        ...(seed.chartType === 'bar' ? { barPadding: 0.32 } : {}),
        ...(seed.chartType === 'line' && seed.area ? { area: true, curve: 'linear' } : {}),
      },
      dataMapping: {
        x: 'x',
        y: 'y',
        ...(grouped ? { group: 'series' } : {}),
      },
      axes: {
        x: { show: true, grid: false, label: seed.xLabel },
        y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 5, label: seed.yLabel },
      },
    },
    printGrayscale: overrides?.printGrayscale ?? seed.printGrayscale,
  };
}

export function parseChartSeed(value: unknown): ChartSeed | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== 'string' || typeof raw.kicker !== 'string' || typeof raw.note !== 'string') {
    return undefined;
  }
  if (raw.chartType !== 'bar' && raw.chartType !== 'line' && raw.chartType !== 'scatter') {
    return undefined;
  }
  if (!Array.isArray(raw.rows) || raw.rows.length < 2) {
    return undefined;
  }
  const rows: ChartSeed['rows'] = [];
  for (const row of raw.rows) {
    if (typeof row !== 'object' || row === null || !('x' in row) || !('y' in row)) {
      continue;
    }
    const y = Number((row as { y: unknown }).y);
    const x = (row as { x: unknown }).x;
    const seriesRaw = (row as { series?: unknown }).series;
    const series = typeof seriesRaw === 'string' ? seriesRaw.trim().slice(0, 40) : '';
    if (!Number.isFinite(y) || (typeof x !== 'string' && typeof x !== 'number')) {
      continue;
    }
    rows.push({ x, y, ...(series ? { series } : {}) });
  }
  if (rows.length < 2) {
    return undefined;
  }
  const method = METHODS.find((item) => item === raw.sourceMethod) ?? 'unknown';
  return {
    title: raw.title.slice(0, 160),
    kicker: raw.kicker.slice(0, 80),
    note: raw.note.slice(0, 280),
    chartType: raw.chartType,
    area: raw.area === true,
    xLabel: typeof raw.xLabel === 'string' ? raw.xLabel.slice(0, 40) : 'Category',
    yLabel: typeof raw.yLabel === 'string' ? raw.yLabel.slice(0, 40) : 'Value',
    sourceLabel: typeof raw.sourceLabel === 'string' ? raw.sourceLabel.slice(0, 120) : 'Unspecified',
    sourceMethod: method,
    evidence: typeof raw.evidence === 'string' ? raw.evidence.slice(0, 160) : '',
    sourceUrl: typeof raw.sourceUrl === 'string' && /^https?:\/\//.test(raw.sourceUrl) ? raw.sourceUrl : undefined,
    printGrayscale: raw.printGrayscale === true,
    rows: rows.slice(0, 60),
  };
}

export function seedBriefing(seed: ChartSeed): string {
  const grouped = seed.rows.some((row) => Boolean(row.series));
  const table = grouped
    ? ['x\ty\tseries', ...seed.rows.map((row) => `${row.x}\t${row.y}\t${row.series ?? ''}`)].join('\n')
    : ['x\ty', ...seed.rows.map((row) => `${row.x}\t${row.y}`)].join('\n');
  return `CURRENT CHART:
title: ${seed.title}
kicker: ${seed.kicker}
note: ${seed.note}
type: ${seed.chartType}${seed.area ? ' (area)' : ''}
xLabel: ${seed.xLabel}
yLabel: ${seed.yLabel}
source: ${seed.sourceLabel} (${seed.sourceMethod})
${seed.evidence ? `evidence: ${seed.evidence}\n` : ''}${seed.sourceUrl ? `url: ${seed.sourceUrl}\n` : ''}${grouped ? 'Keep every series. Do not collapse groups into one line.\n' : ''}
ROWS:
${table}`;
}

export function revisionYearSpan(asked: string): number | undefined {
  const match =
    asked.match(
      /\b(?:make it|last|past|previous|prior|over|see(?: the)?(?: past| last| previous)?|for(?: the)? last|keep(?: the)? last)\s+(ten|five|\d{1,2})\s+years\b/i
    ) ?? asked.match(/\b(ten|five|\d{1,2})\s+years\b/i);
  if (!match) {
    return undefined;
  }
  const raw = (match[1] ?? '').toLowerCase();
  const n = raw === 'ten' ? 10 : raw === 'five' ? 5 : Number(raw);
  if (!Number.isFinite(n) || n < 3 || n > 80) {
    return undefined;
  }
  return n;
}

export function yearishRows(rows: ChartSeed['rows']): ChartSeed['rows'] {
  return rows.filter((row) => rowYear(row.x) !== undefined);
}

export function rowYear(x: string | number): number | undefined {
  const match = String(x).trim().match(/^(?:19|20)\d{2}$/) ?? String(x).match(/\b((?:19|20)\d{2})\b/);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1] ?? match[0]);
  return Number.isFinite(year) ? year : undefined;
}

/** Lookup should search the *chart*, not the short follow-up alone. */
export function revisionLookupQuery(asked: string, seed: ChartSeed): string {
  return `${seed.title}. ${seed.yLabel}. ${asked}`.slice(0, 400);
}

export function followUpNeedsLookup(asked: string, seed?: ChartSeed): boolean {
  if (
    /\b(latest|look ?up|fetch|update the numbers|new data|different data|instead|now chart|start over|this season|extend|forecast|more years|add (?:20)?\d{2})\b/i.test(
      asked
    )
  ) {
    return true;
  }
  const span = revisionYearSpan(asked);
  if (span !== undefined) {
    if (!seed) {
      return true;
    }
    return yearishRows(seed.rows).length < span;
  }
  if (!/\b(through|until|out to)\b/i.test(asked)) {
    return false;
  }
  const years = [...asked.matchAll(/\b((?:19|20)\d{2})\b/g)].map((match) => match[1] ?? '');
  if (years.length === 0 || !seed) {
    return true;
  }
  return years.some((year) => !seed.rows.some((row) => String(row.x).includes(year)));
}

const UNSUPPORTED_VIZ =
  /\b(pictograms?|isotypes?|pies?|donuts?|heatmaps?|choropleths?|sankeys?|treemaps?|radars?|gauges?)\b/i;

export function isUnsupportedVizOnlyRevision(asked: string): boolean {
  if (!UNSUPPORTED_VIZ.test(asked)) {
    return false;
  }
  const stripped = asked
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(make|it|a|an|the|please|pls|chart|graph|plot|use|switch|to|into|as|draw|show|turn)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
  return /^(pictogram|isotype|pie|donut|heatmap|choropleth|sankey|treemap|radar|gauge)s?$/.test(stripped);
}
