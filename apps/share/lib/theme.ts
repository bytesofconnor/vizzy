import { seriesIsSketch, validateChartConfig, type ChartConfig, type Source } from '@vizzy/core';

export const STUDIO = {
  paper: '#ebe9e3',
  ink: '#121211',
  mute: '#534f48',
  rule: '#c5c2b9',
  mark: '#121211',
  wash: '#8f8c84',
  mid: '#6e6b64',
  haze: '#d8d5cc',
} as const;

/** Stone with a 6–7% hue. Same value as wash, so it still sits in any article. */
export const DUST = [
  '#918380',
  '#918880',
  '#8f8c80',
  '#868c81',
  '#818c88',
  '#818891',
  '#868191',
  '#918188',
] as const;

export const DUST_MID = [
  '#726560',
  '#726a60',
  '#6e6b60',
  '#666c61',
  '#616c68',
  '#616872',
  '#666172',
  '#726168',
] as const;

/** Ink-to-paper ramp for newsletters and print PDFs — no hue. */
export const PRINT_PALETTE = [
  STUDIO.ink,
  '#3a3834',
  STUDIO.mid,
  '#7a7770',
  STUDIO.wash,
  '#a8a59c',
  STUDIO.rule,
  STUDIO.haze,
] as const;

export function printColorScheme() {
  return {
    primary: STUDIO.ink,
    secondary: STUDIO.haze,
    accent: STUDIO.ink,
    background: STUDIO.paper,
    text: STUDIO.ink,
    grid: '#b8b5ad',
    palette: [...PRINT_PALETTE],
  };
}

const SERIES_LINE_PALETTE = [
  '#1e3a8a',
  '#c2410c',
  '#166534',
  '#9d174d',
  '#5b21b6',
  '#155e75',
  '#84cc16',
  '#eab308',
] as const;

export function rankedBarsShowValues(config: ChartConfig): ChartConfig {
  if (config.chart.type !== 'bar' || seriesIsSketch(config.source) || config.chart.showValues) {
    return config;
  }
  return {
    ...config,
    chart: { ...config.chart, showValues: true },
  };
}

export function studioChart(
  chart: { type: ChartConfig['chart']['type'] } & Record<string, unknown>,
  mapping: ChartConfig['dataMapping'],
  extra: Record<string, unknown> = {}
): ChartConfig {
  const extraAxes = extra.axes as { x?: Record<string, unknown>; y?: Record<string, unknown> } | undefined;
  const extraDimensions = extra.dimensions as Record<string, unknown> | undefined;
  const extraA11y = extra.accessibility as { title?: string; description?: string } | undefined;
  const extraColors = extra.colors as Record<string, unknown> | undefined;
  const extraLegend = extra.legend as Record<string, unknown> | undefined;
  const rest = { ...extra };
  delete rest.axes;
  delete rest.dimensions;
  delete rest.accessibility;
  delete rest.colors;
  delete rest.legend;
  const xLabel = typeof extraAxes?.x?.label === 'string' ? extraAxes.x.label : undefined;
  const yLabel = typeof extraAxes?.y?.label === 'string' ? extraAxes.y.label : undefined;
  const seriesColor = Boolean(mapping.color && mapping.color !== 'tone');
  const namedLines = chart.type === 'line' && seriesColor;
  const source = extra.source as Source | undefined;
  const resolvedChart =
    chart.type === 'bar'
      ? {
          ...chart,
          barPadding:
            typeof (chart as { barPadding?: number }).barPadding === 'number'
              ? (chart as { barPadding?: number }).barPadding
              : 0.32,
          showValues: seriesIsSketch(source) ? false : true,
        }
      : chart.type === 'line'
        ? {
            ...chart,
            curve: (chart as { curve?: string }).curve === 'step' ? 'step' : 'linear',
          }
        : chart;

  return validateChartConfig({
    schemaVersion: 1,
    chart: resolvedChart,
    dataMapping: mapping,
    dimensions: {
      width: 1100,
      height: 400,
      margin: {
        top: seriesColor ? 56 : 40,
        right: namedLines ? 148 : 40,
        bottom: xLabel ? 96 : 64,
        left: yLabel ? 70 : 48,
      },
      ...extraDimensions,
    },
    colors: {
      primary: STUDIO.ink,
      secondary: STUDIO.haze,
      accent: STUDIO.mark,
      background: STUDIO.paper,
      text: STUDIO.ink,
      grid: STUDIO.rule,
      palette: namedLines ? [...SERIES_LINE_PALETTE] : [STUDIO.ink, STUDIO.mid, STUDIO.wash],
      ...extraColors,
    },
    animation: { enabled: false, duration: 0 },
    interaction: { hover: false, tooltip: false },
    legend: {
      show: seriesColor,
      ...(seriesColor ? { position: 'top' as const, orientation: 'horizontal' as const } : {}),
      ...extraLegend,
    },
    axes: {
      x: { show: true, grid: false, ...extraAxes?.x },
      y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 5, ...extraAxes?.y },
    },
    accessibility: {
      enabled: true,
      ...extraA11y,
    },
    ...rest,
  });
}
