import * as d3 from 'd3';
import { ChartConfig, VizzyError } from '../types';
import { DataDomains } from './DataProcessor';

export interface ScaleSystem {
  x: d3.ScaleLinear<number, number> | d3.ScaleBand<string> | d3.ScalePoint<string> | d3.ScaleTime<number, number>;
  y: d3.ScaleLinear<number, number> | d3.ScaleBand<string>;
  color?: d3.ScaleOrdinal<string, string>;
  size?: d3.ScaleLinear<number, number>;
}

export interface ScaleDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
}

export class ScaleManager {
  private _config: ChartConfig;
  private _dimensions: ScaleDimensions;
  private _scales: ScaleSystem | null = null;

  constructor(config: ChartConfig, dimensions: ScaleDimensions) {
    this._config = config;
    this._dimensions = dimensions;
  }

  public createScales(domains: DataDomains): ScaleSystem {
    try {
      const xScale = this._createXScale(domains.x);
      const yScale = this._createYScale(domains.y);
      const colorScale = domains.color ? this._createColorScale(domains.color) : undefined;
      const sizeScale = domains.size ? this._createSizeScale(domains.size) : undefined;

      const scales: ScaleSystem = {
        x: xScale,
        y: yScale,
      };
      
      if (colorScale !== undefined) {
        scales.color = colorScale;
      }
      
      if (sizeScale !== undefined) {
        scales.size = sizeScale;
      }
      
      this._scales = scales;

      return this._scales ?? null;
    } catch (error) {
      throw new VizzyError(
        'SCALE_CREATION_ERROR',
        'Failed to create scales',
        { error: error instanceof Error ? error.message : String(error) },
        true
      );
    }
  }

  public getScales(): ScaleSystem | null {
    return this._scales;
  }

  public updateDimensions(dimensions: ScaleDimensions): void {
    this._dimensions = dimensions;
    
    // Update scale ranges if scales exist
    if (this._scales) {
      this._updateScaleRanges();
    }
  }

  private _createXScale(
    domain: [number, number] | string[]
  ): d3.ScaleLinear<number, number> | d3.ScaleBand<string> | d3.ScalePoint<string> | d3.ScaleTime<number, number> {
    const { innerWidth } = this._dimensions;
    const { chart } = this._config;

    // Determine scale type based on domain and chart type
    if (Array.isArray(domain) && typeof domain[0] === 'string') {
      if (chart.type === 'bar') {
        const scale = d3.scaleBand<string>()
          .domain(domain as string[])
          .range([0, innerWidth])
          .padding(chart.barPadding);
        if (chart.grouping !== 'single') {
          scale.paddingInner(chart.groupPadding);
        }
        return scale;
      }

      return d3.scalePoint<string>()
        .domain(domain as string[])
        .range([0, innerWidth])
        .padding(chart.type === 'line' ? 0.62 : 0.5);
    } else {
      // Numeric domain
      const [min, max] = domain as [number, number];
      
      // Check if values look like timestamps
      if (this._isTimeDomain(min, max)) {
        return d3.scaleTime()
          .domain([new Date(min), new Date(max)])
          .range([0, innerWidth])
          .nice();
      } else {
        return d3.scaleLinear()
          .domain([min, max])
          .range([0, innerWidth])
          .nice();
      }
    }
  }

  private _createYScale(
    domain: [number, number] | string[]
  ): d3.ScaleLinear<number, number> | d3.ScaleBand<string> {
    const { innerHeight } = this._dimensions;
    const { chart } = this._config;

    if (Array.isArray(domain) && typeof domain[0] === 'string') {
      // Categorical Y scale (rare, but possible for horizontal bar charts)
      return d3.scaleBand<string>()
        .domain(domain as string[])
        .range([innerHeight, 0])
        .padding(chart.type === 'bar' ? chart.barPadding : 0.1);
    } else {
      // Numeric Y scale (most common)
      const [min, max] = domain as [number, number];
      
      return d3.scaleLinear()
        .domain([min, max])
        .range([innerHeight, 0]) // Inverted for SVG coordinate system
        .nice();
    }
  }

  private _createColorScale(domain: string[]): d3.ScaleOrdinal<string, string> {
    const { colors } = this._config;
    
    return d3.scaleOrdinal<string, string>()
      .domain(domain)
      .range(colors.palette);
  }

  private _createSizeScale(domain: [number, number]): d3.ScaleLinear<number, number> {
    const [min, max] = domain;
    
    // Default size range for scatter plots
    const minSize = 3;
    const maxSize = 20;
    
    return d3.scaleLinear()
      .domain([min, max])
      .range([minSize, maxSize])
      .clamp(true);
  }

  private _updateScaleRanges(): void {
    if (!this._scales) return;

    const { innerWidth, innerHeight } = this._dimensions;

    // Update X scale range
    if ('range' in this._scales.x) {
      (this._scales.x as any).range([0, innerWidth]);
    }

    // Update Y scale range
    if ('range' in this._scales.y) {
      (this._scales.y as any).range([innerHeight, 0]);
    }
  }

  private _isTimeDomain(min: number, max: number): boolean {
    // Heuristic: if the numbers are large enough to be timestamps
    // and the range spans more than a day, treat as time
    const minTimestamp = new Date('2000-01-01').getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return min > minTimestamp && (max - min) > dayInMs;
  }

  // Utility methods for working with scales
  public getXValue(dataValue: unknown): number {
    if (!this._scales) {
      throw new VizzyError('SCALES_NOT_INITIALIZED', 'Scales must be created before use');
    }

    const scale = this._scales.x;
    
    if ('bandwidth' in scale) {
      // Band scale
      const bandScale = scale as d3.ScaleBand<string>;
      const scaledValue = bandScale(String(dataValue));
      return scaledValue !== undefined ? scaledValue + bandScale.bandwidth() / 2 : 0;
    } else {
      // Linear or time scale
      if (dataValue instanceof Date) {
        return (scale as d3.ScaleTime<number, number>)(dataValue);
      } else {
        return (scale as d3.ScaleLinear<number, number>)(Number(dataValue));
      }
    }
  }

  public getYValue(dataValue: unknown): number {
    if (!this._scales) {
      throw new VizzyError('SCALES_NOT_INITIALIZED', 'Scales must be created before use');
    }

    const scale = this._scales.y;
    
    if ('bandwidth' in scale) {
      // Band scale
      const bandScale = scale as d3.ScaleBand<string>;
      const scaledValue = bandScale(String(dataValue));
      return scaledValue !== undefined ? scaledValue + bandScale.bandwidth() / 2 : 0;
    } else {
      // Linear scale
      return (scale as d3.ScaleLinear<number, number>)(Number(dataValue));
    }
  }

  public getColorValue(dataValue: string): string {
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(dataValue)) {
      return dataValue;
    }

    if (!this._scales?.color) {
      return this._config.colors.primary;
    }

    return this._scales.color(dataValue) || this._config.colors.primary;
  }

  public getSizeValue(dataValue: unknown): number {
    if (!this._scales?.size) {
      return 5; // Default size
    }
    
    return this._scales.size(Number(dataValue));
  }

  // Helper methods for axis generation
  public createXAxis(): d3.Axis<d3.AxisDomain> {
    if (!this._scales) {
      throw new VizzyError('SCALES_NOT_INITIALIZED', 'Scales must be created before creating axes');
    }

    const axis = d3.axisBottom(this._scales.x as any);
    
    // Configure tick count if specified
    if (this._config.axes.x.tickCount) {
      axis.ticks(this._config.axes.x.tickCount);
    }
    
    // Configure tick format if specified
    if (this._config.axes.x.tickFormat) {
      axis.tickFormat(d3.format(this._config.axes.x.tickFormat) as any);
    }
    
    return axis;
  }

  public createYAxis(): d3.Axis<d3.AxisDomain> {
    if (!this._scales) {
      throw new VizzyError('SCALES_NOT_INITIALIZED', 'Scales must be created before creating axes');
    }

    const axis = d3.axisLeft(this._scales.y as any);
    
    // Configure tick count if specified
    if (this._config.axes.y.tickCount) {
      axis.ticks(this._config.axes.y.tickCount);
    }
    
    // Configure tick format if specified
    if (this._config.axes.y.tickFormat) {
      axis.tickFormat(d3.format(this._config.axes.y.tickFormat) as any);
    }
    
    return axis;
  }
}
