import type { ChartConfig } from './types';

export type BarMark = 'solid' | 'outline' | 'none';

export type BarSpeak = {
  mark: BarMark;
  aria: string;
  tip: string;
  glyph: string | null;
};

export function seriesIsSketch(
  source: { method?: string; url?: string } | undefined
): boolean {
  if (!source || source.url) {
    return false;
  }
  return source.method === 'estimate' || source.method === 'example';
}

function finiteY(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function barSpeak(x: unknown, y: unknown, source: ChartConfig['source']): BarSpeak {
  const label = String(x);
  const value = finiteY(y);
  if (value === null) {
    return { mark: 'none', aria: `${label}: empty`, tip: 'empty', glyph: 'empty' };
  }
  if (seriesIsSketch(source)) {
    return {
      mark: 'outline',
      aria: `${label}: ${value}, unfinished`,
      tip: `${value} unfinished`,
      glyph: null,
    };
  }
  return {
    mark: 'solid',
    aria: `${label}: ${value}`,
    tip: String(value),
    glyph: value === 0 ? '0' : null,
  };
}

export function sketchFrame(config: ChartConfig): ChartConfig {
  if (config.chart.type !== 'bar' || !seriesIsSketch(config.source)) {
    return config;
  }
  return {
    ...config,
    chart: { ...config.chart, showValues: false },
    axes: {
      ...config.axes,
      y: { ...config.axes.y, show: false, grid: false },
    },
  };
}
