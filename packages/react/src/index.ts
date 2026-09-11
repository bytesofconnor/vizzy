// Main Components
export { VizzyChart } from './components/VizzyChart';
export type { VizzyChartProps, VizzyChartRef } from './components/VizzyChart';

// Hooks
export { useVizzyChart } from './hooks/useVizzyChart';
export type { UseVizzyChartOptions, UseVizzyChartReturn } from './hooks/useVizzyChart';

export { useChartData } from './hooks/useChartData';
export type { UseChartDataOptions, UseChartDataReturn } from './hooks/useChartData';

export { useChartConfig } from './hooks/useChartConfig';
export type { UseChartConfigOptions, UseChartConfigReturn } from './hooks/useChartConfig';

// Re-export core types for convenience
export type {
  ChartConfig,
  DataPoint,
  Dataset,
  PerformanceMetrics,
  VizzyError,
} from '@vizzy/core';

// Version
export const VERSION = '0.1.0';

