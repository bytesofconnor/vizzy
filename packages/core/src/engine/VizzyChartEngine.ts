import * as d3 from 'd3';
import {
  ChartConfig,
  ChartInstance,
  DataPoint,
  PerformanceMetrics,
  VizzyError,
  validateChartConfig,
  validateDataset,
} from '../types';
import { xAxisRoom } from '../layout';
import { PerformanceMonitor } from './PerformanceMonitor';
import { EventEmitter } from './EventEmitter';

export class VizzyChartEngine<TData extends DataPoint = DataPoint>
  implements ChartInstance<TData>
{
  public readonly id: string;
  public readonly config: ChartConfig;
  public readonly container: HTMLElement;
  public readonly performance: PerformanceMetrics;

  private _data: TData[] = [];
  private _svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private _isDestroyed = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _performanceMonitor: PerformanceMonitor;
  private _eventEmitter: EventEmitter;

  constructor(
    container: HTMLElement | string,
    config: unknown,
    data: unknown[] = []
  ) {
    // Validate inputs
    this.container = typeof container === 'string' 
      ? document.querySelector(container) as HTMLElement
      : container;
    
    if (!this.container) {
      throw new VizzyError(
        'INVALID_CONTAINER',
        'Container element not found or invalid',
        { container },
        false
      );
    }

    this.config = validateChartConfig(config);
    this._data = validateDataset(data) as TData[];
    
    // Generate unique ID
    this.id = `vizzy-chart-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize systems
    this._performanceMonitor = new PerformanceMonitor();
    this._eventEmitter = new EventEmitter();
    this.performance = this._performanceMonitor.getMetrics();
    
    // Set up container
    this._setupContainer();
    
    // Set up resize observer for responsive charts
    this._setupResizeObserver();
  }

  public get data(): TData[] {
    return [...this._data];
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  public async render(): Promise<void> {
    if (this._isDestroyed) {
      throw new VizzyError('CHART_DESTROYED', 'Cannot render destroyed chart');
    }

    const startTime = performance.now();
    
    try {
      this.emit('render:start');
      
      this._clearContainer();
      await this._renderSVG();
      
      // Update performance metrics
      const renderTime = performance.now() - startTime;
      this._performanceMonitor.recordRenderTime(renderTime);
      this._performanceMonitor.recordDataPoints(this._data.length);
      
      this.emit('render:complete', { renderTime });
      
    } catch (error) {
      this.emit('render:error', error);
      throw error;
    }
  }

  public async update(data: TData[]): Promise<void> {
    if (this._isDestroyed) {
      throw new VizzyError('CHART_DESTROYED', 'Cannot update destroyed chart');
    }

    const startTime = performance.now();
    
    try {
      this.emit('update:start');
      
      // Validate new data
      this._data = validateDataset(data) as TData[];
      
      // Re-render with new data
      await this.render();
      
      const updateTime = performance.now() - startTime;
      this._performanceMonitor.recordUpdateTime(updateTime);
      
      this.emit('update:complete', { updateTime });
      
    } catch (error) {
      this.emit('update:error', error);
      throw error;
    }
  }

  public async resize(): Promise<void> {
    if (this._isDestroyed) return;
    
    try {
      this.emit('resize:start');
      
      // Re-render to accommodate new dimensions
      await this.render();
      
      this.emit('resize:complete');
      
    } catch (error) {
      this.emit('resize:error', error);
      throw error;
    }
  }

  public toSVG(): string {
    const node = this._svg?.node();
    if (!node) {
      throw new VizzyError('NO_SVG', 'Chart has not been rendered');
    }
    return node.outerHTML;
  }

  public destroy(): void {
    if (this._isDestroyed) return;

    this.emit('destroy:start');

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    try {
      this._clearContainer();
    } catch {
      this._svg = null;
    }

    this._eventEmitter.removeAllListeners();
    this._isDestroyed = true;
    this.emit('destroy:complete');
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  public on(event: string, handler: (data: unknown) => void): void {
    this._eventEmitter.on(event, handler);
  }

  public off(event: string, handler?: (data: unknown) => void): void {
    this._eventEmitter.off(event, handler);
  }

  public emit(event: string, data?: unknown): void {
    this._eventEmitter.emit(event, data);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _setupContainer(): void {
    this.container.setAttribute('data-vizzy-chart', this.id);
    this.container.classList.add('vizzy-chart');
  }

  private _setupResizeObserver(): void {
    if (this.config.dimensions.width === 'responsive') {
      this._resizeObserver = new ResizeObserver(
        this._debounce(() => {
          this.resize().catch(_error => {
            // console.error('Resize error:', error);
          });
        }, this.config.performance?.debounceResize ?? 250)
      );
      
      this._resizeObserver.observe(this.container);
    }
  }

  private async _renderSVG(): Promise<void> {
    const { width, height } = this._getContainerDimensions();
    
    // Create SVG element
    this._svg = d3.select(this.container)
      .append('svg')
      .attr('id', this.id)
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('display', 'block')
      .style('width', '100%')
      .style('height', '100%')
      .style('max-width', '100%')
      .style('overflow', 'visible')
      .style('font-family', 'Archivo, Helvetica, sans-serif')
      .style('background', this.config.colors.background);

    this._svg.append('rect')
      .attr('class', 'vizzy-bg')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', this.config.colors.background);

    if (this.config.accessibility.enabled && this.config.accessibility.title) {
      this._svg.append('title').text(this.config.accessibility.title);
    }
    
    // Add accessibility description if provided
    if (this.config.accessibility.enabled && this.config.accessibility.description) {
      this._svg.append('desc')
        .attr('id', `${this.id}-description`)
        .text(this.config.accessibility.description);
    }
    
    // Render chart based on type
    await this._renderChartContent();
  }

  private async _renderChartContent(): Promise<void> {
    if (!this._svg) return;
    
    // Import chart factory dynamically to avoid circular dependencies
    const { ChartFactory } = await import('../charts/ChartFactory');
    
    // Create the appropriate chart renderer
    const chartRenderer = ChartFactory.createChart(this.config);
    
    // Create render context
    const { width, height } = this._getContainerDimensions();
    const { margin } = this.config.dimensions;
    if (this.config.chart.type === 'bar') {
      const names = this._data.map((row) => String(row[this.config.dataMapping.x] ?? ''));
      const room = xAxisRoom(names, {
        hasTitle: Boolean(this.config.axes.x.label),
        innerWidth: width - margin.left - margin.right,
      });
      if (room.bottom > margin.bottom) {
        margin.bottom = room.bottom;
      }
    }
    const dimensions = {
      width,
      height,
      innerWidth: width - margin.left - margin.right,
      innerHeight: height - margin.top - margin.bottom,
    };
    
    const renderContext = {
      svg: this._svg,
      container: this.container,
      dimensions,
      scales: {} as any, // Will be set by the chart renderer
      config: this.config,
    };
    
    // Render the chart
    await chartRenderer.render(renderContext, this._data);
  }

  private _clearContainer(): void {
    this._svg = null;
    if (!this.container) return;
    this.container.replaceChildren();
  }

  private _getContainerDimensions(): { width: number; height: number } {
    if (this.config.dimensions.width === 'responsive') {
      const containerRect = this.container.getBoundingClientRect();
      return {
        width: Math.round(containerRect.width) || 800,
        height: Math.round(containerRect.height) || this.config.dimensions.height,
      };
    }
    
    return {
      width: this.config.dimensions.width as number,
      height: this.config.dimensions.height,
    };
  }

  private _debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}
