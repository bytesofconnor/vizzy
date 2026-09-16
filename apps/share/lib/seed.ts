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
  rows: Array<{ x: string | number; y: number }>;
};

const METHODS = ['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown'] as const;

export function seedFromPiece(piece: Piece): ChartSeed {
  const xField = piece.config.dataMapping.x;
  const yField = piece.config.dataMapping.y;
  const source = piece.config.source;
  const method = METHODS.find((item) => item === source?.method) ?? 'unknown';
  const rows = piece.data
    .map((row) => {
      const y = Number(row[yField]);
      return {
        x: row[xField] as string | number,
        y,
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
  return {
    title: seed.title,
    kicker: seed.kicker,
    note: seed.note,
    data: seed.rows.map((row) => ({ x: row.x, y: row.y })),
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
      dataMapping: { x: 'x', y: 'y' },
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
    if (!Number.isFinite(y) || (typeof x !== 'string' && typeof x !== 'number')) {
      continue;
    }
    rows.push({ x, y });
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
    rows: rows.slice(0, 24),
  };
}

export function seedBriefing(seed: ChartSeed): string {
  const table = ['x\ty', ...seed.rows.map((row) => `${row.x}\t${row.y}`)].join('\n');
  return `CURRENT CHART:
title: ${seed.title}
kicker: ${seed.kicker}
note: ${seed.note}
type: ${seed.chartType}${seed.area ? ' (area)' : ''}
xLabel: ${seed.xLabel}
yLabel: ${seed.yLabel}
source: ${seed.sourceLabel} (${seed.sourceMethod})
${seed.evidence ? `evidence: ${seed.evidence}\n` : ''}${seed.sourceUrl ? `url: ${seed.sourceUrl}\n` : ''}
ROWS:
${table}`;
}

export function followUpNeedsLookup(asked: string): boolean {
  return /\b(latest|look ?up|fetch|update the numbers|new data|different data|instead|now chart|start over|this season)\b/i.test(
    asked
  );
}
