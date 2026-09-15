export { VizzyChartEngine } from './engine/VizzyChartEngine';
export { PerformanceMonitor } from './engine/PerformanceMonitor';
export { EventEmitter } from './engine/EventEmitter';

export { DataProcessor } from './components/DataProcessor';
export { ScaleManager } from './components/ScaleManager';
export { RenderEngine } from './components/RenderEngine';
export type { ProcessedData } from './components/DataProcessor';

export { BarChart, LineChart, ScatterPlot, ChartFactory } from './charts';
export type { ChartRenderer } from './charts';

export * from './types';
export { validateChartRequest, assertValidChartRequest } from './validate';
export { suggestChart } from './suggest';
export type { ChartSuggestion, SuggestHints } from './suggest';
export { compileChart } from './compile';
export type { CompileInput, CompileResult, CompileSnippet } from './compile';
export { renderToSVG } from './render-svg';
export { forecastStartIndex } from './forecast';
export { xAxisRoom, xTickRotate, looksSequentialX, shortCategoryNames } from './layout';

export type {
  ChartConfig,
  ChartInstance,
  DataPoint,
  Dataset,
  ChartValidationResult,
  ValidationIssue,
  Source,
} from './types';

export { validateChartConfig, validateDataset, SCHEMA_VERSION } from './types';

export { default as chartConfigJsonSchema } from './schema/chart-config.v1.json';

export const VERSION = '0.1.0';
