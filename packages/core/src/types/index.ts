import { z } from 'zod';

// ============================================================================
// Core Data Types
// ============================================================================

export const DataPointSchema = z.record(z.union([z.string(), z.number(), z.date(), z.null()]));
export type DataPoint = z.infer<typeof DataPointSchema>;

export const DatasetSchema = z.array(DataPointSchema);
export type Dataset = z.infer<typeof DatasetSchema>;

// ============================================================================
// Chart Configuration Types
// ============================================================================

export const DimensionsSchema = z.object({
  width: z.union([z.number(), z.literal('responsive')]).default('responsive'),
  height: z.number().min(100).max(2000).default(400),
  margin: z.object({
    top: z.number().min(0).default(20),
    right: z.number().min(0).default(20),
    bottom: z.number().min(0).default(40),
    left: z.number().min(0).default(40),
  }).default({}),
});
export type Dimensions = z.infer<typeof DimensionsSchema>;

export const ColorSchemeSchema = z.object({
  primary: z.string().default('#3b82f6'),
  secondary: z.string().default('#ef4444'),
  accent: z.string().default('#10b981'),
  background: z.string().default('#ffffff'),
  text: z.string().default('#1f2937'),
  grid: z.string().default('#e5e7eb'),
  palette: z.array(z.string()).default([
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ]),
});
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;

export const AnimationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  duration: z.number().min(0).max(5000).default(750),
  easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-out'),
  stagger: z.number().min(0).max(1000).default(50),
});
export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;

export const InteractionConfigSchema = z.object({
  hover: z.boolean().default(true),
  click: z.boolean().default(false),
  zoom: z.boolean().default(false),
  brush: z.boolean().default(false),
  tooltip: z.boolean().default(true),
});
export type InteractionConfig = z.infer<typeof InteractionConfigSchema>;

export const AccessibilityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().optional(),
  description: z.string().optional(),
  keyboardNavigation: z.boolean().default(true),
  screenReaderSupport: z.boolean().default(true),
  highContrast: z.boolean().default(false),
});
export type AccessibilityConfig = z.infer<typeof AccessibilityConfigSchema>;

// ============================================================================
// Chart Type Specific Configurations
// ============================================================================

export const BarChartConfigSchema = z.object({
  type: z.literal('bar'),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  grouping: z.enum(['single', 'grouped', 'stacked']).default('single'),
  barPadding: z.number().min(0).max(1).default(0.1),
  groupPadding: z.number().min(0).max(1).default(0.05),
  cornerRadius: z.number().min(0).default(0),
});
export type BarChartConfig = z.infer<typeof BarChartConfigSchema>;

export const LineChartConfigSchema = z.object({
  type: z.literal('line'),
  curve: z.enum(['linear', 'monotone', 'cardinal', 'basis', 'step']).default('monotone'),
  strokeWidth: z.number().min(0.5).max(10).default(2),
  showPoints: z.boolean().default(true),
  pointRadius: z.number().min(1).max(10).default(4),
  area: z.boolean().default(false),
  areaOpacity: z.number().min(0).max(1).default(0.3),
  forecastFrom: z.union([z.string(), z.number()]).optional(),
});
export type LineChartConfig = z.infer<typeof LineChartConfigSchema>;

export const ScatterPlotConfigSchema = z.object({
  type: z.literal('scatter'),
  pointRadius: z.number().min(1).max(20).default(5),
  pointOpacity: z.number().min(0).max(1).default(0.7),
  showTrendLine: z.boolean().default(false),
  trendLineType: z.enum(['linear', 'polynomial', 'exponential']).default('linear'),
});
export type ScatterPlotConfig = z.infer<typeof ScatterPlotConfigSchema>;

export const ChartTypeConfigSchema = z.discriminatedUnion('type', [
  BarChartConfigSchema,
  LineChartConfigSchema,
  ScatterPlotConfigSchema,
]);
export type ChartTypeConfig = z.infer<typeof ChartTypeConfigSchema>;

// ============================================================================
// Axis Configuration
// ============================================================================

export const AxisConfigSchema = z.object({
  show: z.boolean().default(true),
  label: z.string().optional(),
  tickCount: z.number().min(2).max(20).optional(),
  tickFormat: z.string().optional(),
  domain: z.tuple([z.number(), z.number()]).optional(),
  grid: z.boolean().default(true),
  gridOpacity: z.number().min(0).max(1).default(0.1),
});
export type AxisConfig = z.infer<typeof AxisConfigSchema>;

export const AxesConfigSchema = z.object({
  x: AxisConfigSchema.default({}),
  y: AxisConfigSchema.default({}),
});
export type AxesConfig = z.infer<typeof AxesConfigSchema>;

// ============================================================================
// Legend Configuration
// ============================================================================

export const LegendConfigSchema = z.object({
  show: z.boolean().default(true),
  position: z.enum(['top', 'bottom', 'left', 'right']).default('right'),
  orientation: z.enum(['horizontal', 'vertical']).default('vertical'),
  itemSpacing: z.number().min(5).max(50).default(10),
  symbolSize: z.number().min(5).max(20).default(12),
});
export type LegendConfig = z.infer<typeof LegendConfigSchema>;

// ============================================================================
// Performance and Rendering Types
// ============================================================================

export const RenderStrategySchema = z.enum(['svg', 'canvas', 'hybrid']);
export type RenderStrategy = z.infer<typeof RenderStrategySchema>;

export const ChartPerformanceConfigSchema = z.object({
  renderStrategy: RenderStrategySchema.default('svg'),
  enableVirtualization: z.boolean().default(false),
  maxDataPoints: z.number().min(100).default(10000),
  debounceResize: z.number().min(0).max(1000).default(250),
  enableWebGL: z.boolean().default(false),
});
export type ChartPerformanceConfig = z.infer<typeof ChartPerformanceConfigSchema>;

// ============================================================================
// Complete Chart Configuration
// ============================================================================

export const SCHEMA_VERSION = 1 as const;

export const SourceMethodSchema = z.enum([
  'official',
  'export',
  'scraped',
  'estimate',
  'manual',
  'example',
  'unknown',
]);

export const SourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  retrieved: z.string().optional(),
  method: SourceMethodSchema.default('unknown'),
  evidence: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const ChartConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  dimensions: DimensionsSchema.default({}),
  colors: ColorSchemeSchema.default({}),
  animation: AnimationConfigSchema.default({}),
  interaction: InteractionConfigSchema.default({}),
  accessibility: AccessibilityConfigSchema.default({}),
  performance: ChartPerformanceConfigSchema.default({}),
  axes: AxesConfigSchema.default({}),
  legend: LegendConfigSchema.default({}),
  chart: ChartTypeConfigSchema,
  dataMapping: z.object({
    x: z.string(),
    y: z.string(),
    color: z.string().optional(),
    size: z.string().optional(),
    group: z.string().optional(),
  }),
  source: SourceSchema.optional(),
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ChartValidationResult {
  valid: boolean;
  config?: ChartConfig;
  issues: ValidationIssue[];
}

// ============================================================================
// Chart Instance Types
// ============================================================================

export interface ChartInstance<TData extends DataPoint = DataPoint> {
  readonly id: string;
  readonly config: ChartConfig;
  readonly data: TData[];
  readonly container: HTMLElement;
  readonly performance: PerformanceMetrics;
  
  // Lifecycle methods
  render(): Promise<void>;
  update(data: TData[]): Promise<void>;
  resize(): Promise<void>;
  destroy(): void;
  
  // Event handling
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler?: (data: unknown) => void): void;
  emit(event: string, data?: unknown): void;
}

export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  frameRate: number;
  dataPointsRendered: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const ChartErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  recoverable: z.boolean().default(true),
});
export type ChartError = z.infer<typeof ChartErrorSchema>;

export class VizzyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'VizzyError';
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

export const validateChartConfig = (config: unknown): ChartConfig => {
  try {
    return ChartConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new VizzyError(
        'INVALID_CONFIG',
        'Chart configuration validation failed',
        { zodError: error.errors },
        true
      );
    }
    throw error instanceof Error ? error : new Error('Unknown validation error');
  }
};

export const validateDataset = (data: unknown): Dataset => {
  try {
    return DatasetSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new VizzyError(
        'INVALID_DATA',
        'Dataset validation failed',
        { zodError: error.errors },
        true
      );
    }
    throw error instanceof Error ? error : new Error('Unknown validation error');
  }
};
