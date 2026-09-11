import * as d3 from 'd3';
import { DataPoint, ChartConfig, VizzyError } from '../types';

export interface ProcessedData<TData extends DataPoint = DataPoint> {
  original: TData[];
  processed: TData[];
  statistics: DataStatistics;
  domains: DataDomains;
}

export interface DataStatistics {
  count: number;
  xStats: NumericStatistics | null;
  yStats: NumericStatistics | null;
  colorStats: CategoricalStatistics | null;
  sizeStats: NumericStatistics | null;
}

export interface NumericStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  quartiles: [number, number, number]; // Q1, Q2, Q3
}

export interface CategoricalStatistics {
  unique: string[];
  counts: Record<string, number>;
  mostFrequent: string;
}

export interface DataDomains {
  x: [number, number] | string[];
  y: [number, number] | string[];
  color?: string[] | undefined;
  size?: [number, number] | undefined;
}

export class DataProcessor<TData extends DataPoint = DataPoint> {
  private _config: ChartConfig;
  private _data: TData[] = [];
  private _processedData: ProcessedData<TData> | null = null;

  constructor(config: ChartConfig) {
    this._config = config;
  }

  public process(data: TData[]): ProcessedData<TData> {
    if (!Array.isArray(data)) {
      throw new VizzyError(
        'INVALID_DATA_FORMAT',
        'Data must be an array',
        { data },
        true
      );
    }

    this._data = data;
    
    try {
      // Validate data mapping
      this._validateDataMapping();
      
      // Clean and transform data
      const processed = this._cleanData();
      
      // Calculate statistics
      const statistics = this._calculateStatistics(processed);
      
      // Determine domains
      const domains = this._calculateDomains(processed, statistics);
      
      this._processedData = {
        original: data,
        processed,
        statistics,
        domains,
      };
      
      return this._processedData;
      
    } catch (error) {
      if (error instanceof VizzyError) {
        throw error;
      }
      
      throw new VizzyError(
        'DATA_PROCESSING_ERROR',
        'Failed to process data',
        { error: error instanceof Error ? error.message : String(error) },
        true
      );
    }
  }

  public getProcessedData(): ProcessedData<TData> | null {
    return this._processedData;
  }

  private _validateDataMapping(): void {
    const { dataMapping } = this._config;
    
    if (!dataMapping.x || !dataMapping.y) {
      throw new VizzyError(
        'MISSING_DATA_MAPPING',
        'Both x and y data mappings are required',
        { dataMapping },
        true
      );
    }

    // Check if mapped fields exist in data
    if (this._data.length > 0) {
      const sampleRow = this._data[0];
      
      if (!sampleRow) {
        throw new VizzyError(
          'INVALID_DATA_STRUCTURE',
          'Data array contains undefined elements',
          {},
          true
        );
      }
      
      const availableFields = Object.keys(sampleRow);
      
      if (!(dataMapping.x in sampleRow)) {
        throw new VizzyError(
          'INVALID_X_MAPPING',
          `X field '${dataMapping.x}' not found in data`,
          { availableFields },
          true
        );
      }
      
      if (!(dataMapping.y in sampleRow)) {
        throw new VizzyError(
          'INVALID_Y_MAPPING',
          `Y field '${dataMapping.y}' not found in data`,
          { availableFields },
          true
        );
      }
    }
  }

  private _cleanData(): TData[] {
    return this._data.filter((row, _index) => {
      const xValue = row[this._config.dataMapping.x];
      const yValue = row[this._config.dataMapping.y];
      
      // Remove rows with null/undefined required values
      if (xValue == null || yValue == null) {
        return false;
      }
      
      // Remove rows with invalid numeric values if expected
      if (this._shouldBeNumeric('x') && !this._isValidNumber(xValue)) {
        // console.warn(`Invalid x value at row ${index}:`, xValue);
        return false;
      }
      
      if (this._shouldBeNumeric('y') && !this._isValidNumber(yValue)) {
        // console.warn(`Invalid y value at row ${index}:`, yValue);
        return false;
      }
      
      return true;
    });
  }

  private _shouldBeNumeric(axis: 'x' | 'y'): boolean {
    const { chart } = this._config;
    
    // Line charts take categorical or time-like x; y must be numeric.
    if (chart.type === 'line') {
      return axis === 'y';
    }

    if (chart.type === 'scatter') {
      return true;
    }
    
    // Bar charts can have categorical x-axis
    if (chart.type === 'bar') {
      return axis === 'y'; // Y-axis should be numeric for bar charts
    }
    
    return false;
  }

  private _isValidNumber(value: unknown): boolean {
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num);
    }
    
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    return false;
  }

  private _calculateStatistics(data: TData[]): DataStatistics {
    const xValues = data.map(d => d[this._config.dataMapping.x]);
    const yValues = data.map(d => d[this._config.dataMapping.y]);
    
    const colorField = this._config.dataMapping.color;
    const sizeField = this._config.dataMapping.size;
    
    return {
      count: data.length,
      xStats: this._calculateNumericStats(xValues),
      yStats: this._calculateNumericStats(yValues),
      colorStats: colorField ? this._calculateCategoricalStats(
        data.map(d => String(d[colorField]))
      ) : null,
      sizeStats: sizeField ? this._calculateNumericStats(
        data.map(d => d[sizeField])
      ) : null,
    };
  }

  private _calculateNumericStats(values: unknown[]): NumericStatistics | null {
    const numericValues = values
      .map(v => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return parseFloat(v);
        if (v instanceof Date) return v.getTime();
        return NaN;
      })
      .filter(v => !isNaN(v) && isFinite(v));
    
    if (numericValues.length === 0) return null;
    
    const sorted = [...numericValues].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const mean = d3.mean(numericValues) ?? 0;
    const median = d3.median(numericValues) ?? 0;
    
    // Calculate standard deviation
    const variance = d3.variance(numericValues) ?? 0;
    const stdDev = Math.sqrt(variance);
    
    // Calculate quartiles
    const q1 = d3.quantile(sorted, 0.25) ?? min;
    const q2 = median;
    const q3 = d3.quantile(sorted, 0.75) ?? max;
    
    return {
      min,
      max,
      mean,
      median,
      stdDev,
      quartiles: [q1, q2, q3],
    };
  }

  private _calculateCategoricalStats(values: string[]): CategoricalStatistics {
    const counts: Record<string, number> = {};
    const unique: string[] = [];
    
    for (const value of values) {
      if (!(value in counts)) {
        counts[value] = 0;
        unique.push(value);
      }
      counts[value] = (counts[value] ?? 0) + 1;
    }
    
    // Find most frequent value
    let mostFrequent = unique[0] ?? '';
    let maxCount = 0;
    
    for (const [value, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = value;
      }
    }
    
    return {
      unique,
      counts,
      mostFrequent,
    };
  }

  private _calculateDomains(data: TData[], stats: DataStatistics): DataDomains {
    if (data.length === 0) {
      return { x: [], y: [0, 1] };
    }

    const { dataMapping, axes } = this._config;
    
    // X domain
    let xDomain: [number, number] | string[];
    if (axes.x.domain) {
      xDomain = axes.x.domain as [number, number];
    } else if (stats.xStats) {
      // Numeric domain with padding
      const padding = (stats.xStats.max - stats.xStats.min) * 0.05;
      xDomain = [stats.xStats.min - padding, stats.xStats.max + padding];
    } else {
      // Categorical domain
      xDomain = [...new Set(data.map(d => String(d[dataMapping.x])))];
    }
    
    // Y domain
    let yDomain: [number, number] | string[];
    if (axes.y.domain) {
      yDomain = axes.y.domain as [number, number];
    } else if (stats.yStats) {
      const padding = (stats.yStats.max - stats.yStats.min) * 0.05;
      const barFromZero =
        this._config.chart.type === 'bar' &&
        stats.yStats.min >= 0 &&
        !axes.y.domain;
      yDomain = [
        barFromZero ? 0 : stats.yStats.min - padding,
        stats.yStats.max + padding,
      ];
    } else {
      // Categorical domain
      yDomain = [...new Set(data.map(d => String(d[dataMapping.y])))];
    }
    
    // Color domain (if applicable)
    let colorDomain: string[] | undefined;
    if (dataMapping.color && stats.colorStats) {
      colorDomain = stats.colorStats.unique;
    }
    
    // Size domain (if applicable)
    let sizeDomain: [number, number] | undefined;
    if (dataMapping.size && stats.sizeStats) {
      sizeDomain = [stats.sizeStats.min, stats.sizeStats.max];
    }
    
    const domains: DataDomains = {
      x: xDomain,
      y: yDomain,
    };
    
    if (colorDomain !== undefined) {
      domains.color = colorDomain;
    }
    
    if (sizeDomain !== undefined) {
      domains.size = sizeDomain;
    }
    
    return domains;
  }
}
