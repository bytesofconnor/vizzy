import { ChartConfig, validateChartConfig } from '../types';

export const SAMPLE_REVENUE = [
  { month: 'Jan', revenue: 4000, users: 240 },
  { month: 'Feb', revenue: 3000, users: 139 },
  { month: 'Mar', revenue: 2000, users: 980 },
  { month: 'Apr', revenue: 2780, users: 390 },
  { month: 'May', revenue: 1890, users: 480 },
  { month: 'Jun', revenue: 2390, users: 380 },
];

export function barConfig(): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type: 'bar' },
    dataMapping: { x: 'month', y: 'revenue' },
    dimensions: { width: 800, height: 400 },
    animation: { enabled: false, duration: 0 },
    accessibility: { enabled: true, title: 'Monthly revenue' },
  });
}

export function lineConfig(): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type: 'line' },
    dataMapping: { x: 'month', y: 'revenue' },
    dimensions: { width: 800, height: 400 },
    animation: { enabled: false, duration: 0 },
  });
}

export function scatterConfig(): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type: 'scatter' },
    dataMapping: { x: 'users', y: 'revenue' },
    dimensions: { width: 800, height: 400 },
    animation: { enabled: false, duration: 0 },
  });
}

export function createContainer(size: { width?: number; height?: number } = {}): HTMLDivElement {
  const width = size.width ?? 800;
  const height = size.height ?? 400;
  const el = document.createElement('div');
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  document.body.appendChild(el);
  return el;
}
