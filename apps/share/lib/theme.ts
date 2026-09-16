import { ChartConfig, validateChartConfig } from '@vizzy/core';

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
  const resolvedChart =
    chart.type === 'bar'
      ? {
          ...chart,
          barPadding:
            typeof (chart as { barPadding?: number }).barPadding === 'number'
              ? (chart as { barPadding?: number }).barPadding
              : 0.32,
          showValues: (chart as { showValues?: boolean }).showValues ?? true,
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
        top: 40,
        right: 40,
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
      palette: [STUDIO.ink, STUDIO.mid, STUDIO.wash],
      ...extraColors,
    },
    animation: { enabled: false, duration: 0 },
    interaction: { hover: false, tooltip: false },
    legend: { show: false, ...extraLegend },
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
