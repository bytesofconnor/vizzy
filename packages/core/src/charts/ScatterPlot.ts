import * as d3 from 'd3';
import { bindChartTip, formatTipNumber, pointHitTarget, seriesTipLabel } from '../chart-tip';
import { ChartConfig, DataPoint, VizzyError } from '../types';
import { ScaleManager } from '../components/ScaleManager';
import { RenderEngine, RenderContext } from '../components/RenderEngine';
import { DataProcessor, ProcessedData } from '../components/DataProcessor';

export class ScatterPlot<TData extends DataPoint = DataPoint> {
  private _config: ChartConfig;
  private _scaleManager!: ScaleManager;
  private _renderEngine!: RenderEngine;
  private _dataProcessor: DataProcessor<TData>;
  private _processedData: ProcessedData<TData> | null = null;
  private _host: HTMLElement | null = null;

  constructor(config: ChartConfig) {
    this._config = config;
    this._dataProcessor = new DataProcessor(config);
    
    // Validate that this is a scatter plot config
    if (config.chart.type !== 'scatter') {
      throw new VizzyError(
        'INVALID_CHART_TYPE',
        'ScatterPlot can only render scatter plot configurations',
        { expectedType: 'scatter', actualType: config.chart.type }
      );
    }
  }

  public async render(
    context: RenderContext,
    data: TData[]
  ): Promise<void> {
    try {
      this._host = context.container;
      // Process data
      this._processedData = this._dataProcessor.process(data);
      
      // Initialize scale manager with dimensions
      this._scaleManager = new ScaleManager(this._config, context.dimensions);
      const scales = this._scaleManager.createScales(this._processedData.domains);
      
      // Update render context with scales
      context.scales = scales;
      
      // Initialize render engine
      this._renderEngine = new RenderEngine('svg', this._config);
      this._renderEngine.setContext(context);
      
      // Render chart components
      await this._renderEngine.renderGrid();
      await this._renderPoints(context);
      
      // Render trend line if enabled
      const chartConfig = this._config.chart as any;
      if (chartConfig.showTrendLine) {
        await this._renderTrendLine(context);
      }
      
      await this._renderEngine.renderAxes();
      
      // Render legend if needed
      if (this._config.legend.show && this._processedData.statistics.colorStats) {
        const legendData = this._processedData.statistics.colorStats.unique.map(value => ({
          label: value,
          color: this._scaleManager.getColorValue(value),
        }));
        await this._renderEngine.renderLegend(legendData);
      }
      
    } catch (error) {
      throw new VizzyError(
        'SCATTER_PLOT_RENDER_ERROR',
        'Failed to render scatter plot',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async _renderPoints(context: RenderContext): Promise<void> {
    if (!context.svg || !this._processedData) return;

    const { svg, dimensions: _dimensions, config } = context;
    const { margin } = config.dimensions;
    const chartConfig = config.chart as any; // Scatter plot specific config
    
    // Create points group
    const pointsGroup = svg.select('.points-group').empty()
      ? svg.append('g').attr('class', 'points-group')
      : svg.select('.points-group');

    pointsGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Bind data to points
    const points = (pointsGroup as any).selectAll('.point')
      .data(this._processedData.processed, (d: any) => `${d[config.dataMapping.x]}-${d[config.dataMapping.y]}`);

    // Remove old points
    points.exit()
      .transition()
      .duration(config.animation.enabled ? config.animation.duration : 0)
      .attr('r', 0)
      .remove();

    // Add new points
    const pointsEnter = points.enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d: TData) => this._scaleManager.getXValue(d[config.dataMapping.x]))
      .attr('cy', (d: TData) => this._scaleManager.getYValue(d[config.dataMapping.y]))
      .attr('r', 0)
      .attr('fill', (d: TData) => this._getPointColor(d))
      .attr('stroke', 'none')
      .attr('opacity', chartConfig.pointOpacity || 0.55);

    // Update all points
    const pointsUpdate = pointsEnter.merge(points);

    if (config.animation.enabled) {
      pointsUpdate
        .transition()
        .duration(config.animation.duration)
        .delay((d, i) => i * config.animation.stagger)
        .ease(d3.easeQuadOut)
        .attr('cx', (d: TData) => this._scaleManager.getXValue(d[config.dataMapping.x]))
        .attr('cy', (d: TData) => this._scaleManager.getYValue(d[config.dataMapping.y]))
        .attr('r', (d: TData) => this._getPointRadius(d))
        .attr('fill', (d: TData) => this._getPointColor(d));
    } else {
      pointsUpdate
        .attr('cx', (d: TData) => this._scaleManager.getXValue(d[config.dataMapping.x]))
        .attr('cy', (d: TData) => this._scaleManager.getYValue(d[config.dataMapping.y]))
        .attr('r', (d: TData) => this._getPointRadius(d))
        .attr('fill', (d: TData) => this._getPointColor(d));
    }

    // Add interactions
    if (config.interaction.hover) {
      this._addPointInteractions(pointsUpdate);
    }

    if (config.interaction.click) {
      this._addClickInteractions(pointsUpdate);
    }

    // Add accessibility
    if (config.accessibility.enabled) {
      this._addAccessibilityAttributes(pointsUpdate);
    }
  }

  private async _renderTrendLine(context: RenderContext): Promise<void> {
    if (!context.svg || !this._processedData) return;

    const { svg, config } = context;
    const { margin } = config.dimensions;
    const chartConfig = config.chart as any;
    
    // Calculate trend line using linear regression
    const trendData = this._calculateTrendLine(this._processedData.processed);
    
    if (!trendData) return;

    // Create trend line group
    const trendGroup = svg.select('.trend-group').empty()
      ? svg.append('g').attr('class', 'trend-group')
      : svg.select('.trend-group');

    trendGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create line generator
    const line = d3.line<{ x: number; y: number }>()
      .x(d => this._scaleManager.getXValue(d.x))
      .y(d => this._scaleManager.getYValue(d.y));

    // Render trend line
    let trendLine = trendGroup.select('.trend-line');
    
    if (trendLine.empty()) {
      trendLine = trendGroup.append('path')
        .attr('class', 'trend-line')
        .attr('fill', 'none')
        .attr('stroke', config.colors.secondary)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.8);
    }

    if (config.animation.enabled) {
      const totalLength = (trendLine.node() as SVGPathElement)?.getTotalLength() || 0;
      trendLine
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .attr('d', line(trendData))
        .transition()
        .duration(config.animation.duration)
        .delay(config.animation.duration / 2) // Start after points
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-dasharray', '5,5');
    } else {
      trendLine.attr('d', line(trendData));
    }

    // Add trend line accessibility
    if (config.accessibility.enabled) {
      trendLine
        .attr('role', 'graphics-symbol')
        .attr('aria-roledescription', 'trend line')
        .attr('aria-label', `Trend line showing ${chartConfig.trendLineType} regression`);
    }
  }

  private _calculateTrendLine(data: TData[]): Array<{ x: number; y: number }> | null {
    const { dataMapping } = this._config;
    
    // Extract numeric values
    const points = data
      .map(d => ({
        x: Number(d[dataMapping.x]),
        y: Number(d[dataMapping.y])
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (points.length < 2) return null;

    // Calculate linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate trend line points
    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    
    return [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept }
    ];
  }

  private _getPointRadius(d: TData): number {
    const { dataMapping } = this._config;
    const chartConfig = this._config.chart as any;
    
    if (dataMapping.size && d[dataMapping.size] !== undefined) {
      return this._scaleManager.getSizeValue(d[dataMapping.size]);
    }
    
    return chartConfig.pointRadius || 5;
  }

  private _getPointColor(d: TData): string {
    const { dataMapping } = this._config;
    
    if (dataMapping.color && d[dataMapping.color] !== undefined) {
      return this._scaleManager.getColorValue(String(d[dataMapping.color]));
    }
    
    return this._config.colors.primary;
  }

  private _addPointInteractions(
    points: d3.Selection<SVGCircleElement, TData, SVGGElement, unknown>
  ): void {
    const { dataMapping, interaction } = this._config;
    const host = this._host;
    const scales = this._scaleManager.getScales();
    const domain = (scales?.y.domain() as [number, number] | undefined) ?? [0, 1];
    const seriesField = dataMapping.group ?? dataMapping.color;

    points
      .style('cursor', 'default')
      .style('pointer-events', 'all')
      .on('mouseenter', function () {
        const current = parseFloat(d3.select(this).attr('r') || '5');
        d3.select(this).attr('data-r0', String(current)).attr('r', current * 1.25);
      })
      .on('mouseleave', function () {
        const original = parseFloat(d3.select(this).attr('data-r0') || d3.select(this).attr('r') || '5');
        d3.select(this).attr('r', original);
      });

    if (!host || interaction.tooltip === false) {
      return;
    }

    points.each((d, index, nodes) => {
      const node = nodes[index];
      if (!node) {
        return;
      }
      const tip = () => ({
        title: String(d[dataMapping.x] ?? ''),
        value: formatTipNumber(d[dataMapping.y], domain),
        series: seriesField ? seriesTipLabel(d[seriesField]) : undefined,
      });
      bindChartTip(host, pointHitTarget(node), tip);
      bindChartTip(host, node, tip);
    });
  }

  private _addClickInteractions(
    points: d3.Selection<SVGCircleElement, TData, SVGGElement, unknown>
  ): void {
    points.on('click', (_event, _d) => {
      // Emit click event (would be handled by the chart engine)
      // console.log('Point clicked:', d);
    });
  }

  private _addAccessibilityAttributes(
    points: d3.Selection<SVGCircleElement, TData, SVGGElement, unknown>
  ): void {
    const { dataMapping } = this._config;
    
    points
      .attr('role', 'graphics-symbol')
      .attr('aria-roledescription', 'data point')
      .attr('aria-label', (d: TData) => {
        const xValue = d[dataMapping.x];
        const yValue = d[dataMapping.y];
        let label = `Point: ${xValue}, ${yValue}`;
        
        if (dataMapping.color && d[dataMapping.color]) {
          label += `, ${dataMapping.color}: ${d[dataMapping.color]}`;
        }
        
        if (dataMapping.size && d[dataMapping.size]) {
          label += `, ${dataMapping.size}: ${d[dataMapping.size]}`;
        }
        
        return label;
      })
      .attr('tabindex', this._config.accessibility.keyboardNavigation ? 0 : -1);

    if (this._config.accessibility.keyboardNavigation) {
      points.on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          // Trigger click event
          (points as any).dispatch('click', { detail: d });
        }
      });
    }
  }
}
