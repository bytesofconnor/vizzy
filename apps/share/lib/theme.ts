import { ChartConfig, validateChartConfig } from '@vizzy/core';

export const STUDIO = {
  paper: '#ebe9e3',
  ink: '#121211',
  mute: '#6b6962',
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
  return validateChartConfig({
    schemaVersion: 1,
    chart,
    dataMapping: mapping,
    dimensions: {
      width: 1100,
      height: 400,
      margin: { top: 40, right: 40, bottom: 52, left: 48 },
    },
    colors: {
      primary: STUDIO.ink,
      secondary: STUDIO.haze,
      accent: STUDIO.mark,
      background: STUDIO.paper,
      text: STUDIO.ink,
      grid: STUDIO.rule,
      palette: [STUDIO.ink, STUDIO.mid, STUDIO.wash],
    },
    animation: { enabled: false, duration: 0 },
    interaction: { hover: false, tooltip: false },
    legend: { show: false },
    axes: {
      x: { show: true, grid: false },
      y: { show: true, grid: true, gridOpacity: 0.65, tickCount: 3 },
    },
    accessibility: { enabled: true },
    ...extra,
  });
}
