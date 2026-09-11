import * as d3 from 'd3';
import { ChartConfig, DataPoint, VizzyError } from '../types';
import { ScaleManager } from '../components/ScaleManager';
import { RenderEngine, RenderContext } from '../components/RenderEngine';
import { DataProcessor, ProcessedData } from '../components/DataProcessor';

export class BarChart<TData extends DataPoint = DataPoint> {
  private _config: ChartConfig;
  private _scaleManager!: ScaleManager;
  private _renderEngine!: RenderEngine;
  private _dataProcessor: DataProcessor<TData>;
  private _processedData: ProcessedData<TData> | null = null;

  constructor(config: ChartConfig) {
    this._config = config;
    this._dataProcessor = new DataProcessor(config);
    
    // Validate that this is a bar chart config
    if (config.chart.type !== 'bar') {
      throw new VizzyError(
        'INVALID_CHART_TYPE',
        'BarChart can only render bar chart configurations',
        { expectedType: 'bar', actualType: config.chart.type }
      );
    }
  }

  public async render(
    context: RenderContext,
    data: TData[]
  ): Promise<void> {
    try {
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
      await this._renderBars(context);
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
        'BAR_CHART_RENDER_ERROR',
        'Failed to render bar chart',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async _renderBars(context: RenderContext): Promise<void> {
    if (!context.svg || !this._processedData) return;

    const { svg, config } = context;
    const { margin } = config.dimensions;
    const chartConfig = config.chart as any;
    
    // Create bars group
    const barsGroup = svg.select('.bars-group').empty()
      ? svg.append('g').attr('class', 'bars-group')
      : svg.select('.bars-group');

    barsGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Determine grouping strategy
    const groupField = config.dataMapping.group;
    
    if (chartConfig.grouping === 'single' || !groupField) {
      await this._renderSingleBars(barsGroup as any, this._processedData.processed);
    } else if (chartConfig.grouping === 'grouped') {
      await this._renderGroupedBars(barsGroup as any, this._processedData.processed);
    } else if (chartConfig.grouping === 'stacked') {
      await this._renderStackedBars(barsGroup as any, this._processedData.processed);
    }
  }

  private async _renderSingleBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[]
  ): Promise<void> {
    const { dataMapping, chart, colors, animation } = this._config;
    const chartConfig = chart as any;
    
    // Bind data to bars
    const bars = group.selectAll('.bar')
      .data(data, (d: any) => d[dataMapping.x]);

    // Remove old bars
    bars.exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .attr('height', 0)
      .attr('y', this._scaleManager.getYValue(0))
      .remove();

    // Add new bars
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: TData) => {
        const xValue = this._scaleManager.getXValue(d[dataMapping.x]);
        const bandwidth = (this._scaleManager.getScales()?.x as any).bandwidth?.() || 0;
        return xValue - bandwidth / 2;
      })
      .attr('y', this._scaleManager.getYValue(0))
      .attr('width', () => {
        const scales = this._scaleManager.getScales();
        return (scales?.x as any).bandwidth?.() || 20;
      })
      .attr('height', 0)
      .attr('fill', (d: TData) => {
        if (dataMapping.color && d[dataMapping.color]) {
          return this._scaleManager.getColorValue(String(d[dataMapping.color]));
        }
        return colors.primary;
      })
      .attr('stroke', 'none')
      .attr('rx', chartConfig.cornerRadius || 0)
      .attr('ry', chartConfig.cornerRadius || 0);

    // Update all bars
    const barsUpdate = barsEnter.merge(bars as any);

    if (animation.enabled) {
      barsUpdate
        .transition()
        .duration(animation.duration)
        .delay((_d, i) => i * animation.stagger)
        .ease(d3.easeQuadOut)
        .attr('x', (d: TData) => {
          const xValue = this._scaleManager.getXValue(d[dataMapping.x]);
          const bandwidth = (this._scaleManager.getScales()?.x as any).bandwidth?.() || 0;
          return xValue - bandwidth / 2;
        })
        .attr('y', (d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
        .attr('height', (d: TData) => {
          const yValue = this._scaleManager.getYValue(d[dataMapping.y]);
          const zeroValue = this._scaleManager.getYValue(0);
          return Math.abs(zeroValue - yValue);
        });
    } else {
      barsUpdate
        .attr('x', (d: TData) => {
          const xValue = this._scaleManager.getXValue(d[dataMapping.x]);
          const bandwidth = (this._scaleManager.getScales()?.x as any).bandwidth?.() || 0;
          return xValue - bandwidth / 2;
        })
        .attr('y', (d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
        .attr('height', (d: TData) => {
          const yValue = this._scaleManager.getYValue(d[dataMapping.y]);
          const zeroValue = this._scaleManager.getYValue(0);
          return Math.abs(zeroValue - yValue);
        });
    }

    // Add interactions
    if (this._config.interaction.hover) {
      this._addHoverInteractions(barsUpdate);
    }

    if (this._config.interaction.click) {
      this._addClickInteractions(barsUpdate);
    }

    if (this._config.accessibility.enabled) {
      this._addAccessibilityAttributes(barsUpdate);
    }

    this._drawBaseline(group);
    this._labelLeadBar(group, data);
  }

  private async _renderGroupedBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[]
  ): Promise<void> {
    // Implementation for grouped bars
    // This would involve grouping data by the group field and creating sub-bands
    // For now, fall back to single bars
    await this._renderSingleBars(group, data);
  }

  private async _renderStackedBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[]
  ): Promise<void> {
    // Implementation for stacked bars
    // This would involve stacking values and calculating cumulative heights
    // For now, fall back to single bars
    await this._renderSingleBars(group, data);
  }

  private _drawBaseline(
    group: d3.Selection<SVGGElement, unknown, null, undefined>
  ): void {
    const scales = this._scaleManager.getScales();
    if (!scales) {
      return;
    }

    const [x0, x1] = scales.x.range() as [number, number];
    const y0 = this._scaleManager.getYValue(0);

    group.selectAll('.bar-baseline').data([0]).join('line')
      .attr('class', 'bar-baseline')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', y0)
      .attr('y2', y0)
      .attr('stroke', this._config.colors.text)
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1);
  }

  private _labelLeadBar(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[]
  ): void {
    const { dataMapping, colors } = this._config;
    if (data.length === 0) {
      return;
    }

    const lead = data.reduce((best, row) =>
      Number(row[dataMapping.y]) > Number(best[dataMapping.y]) ? row : best
    );

    const scales = this._scaleManager.getScales();
    const bandwidth = scales && 'bandwidth' in scales.x ? scales.x.bandwidth() : 0;
    const x = this._scaleManager.getXValue(lead[dataMapping.x]);
    const y = this._scaleManager.getYValue(lead[dataMapping.y]);

    group.selectAll('.bar-label').data([lead]).join('text')
      .attr('class', 'bar-label')
      .attr('x', x + bandwidth / 2 + 8)
      .attr('y', y + 4)
      .attr('text-anchor', 'start')
      .attr('fill', colors.text)
      .style('font-size', '12px')
      .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
      .text(String(lead[dataMapping.y]));
  }

  private _addHoverInteractions(
    bars: d3.Selection<SVGRectElement, TData, SVGGElement, unknown>
  ): void {
    const { colors } = this._config;
    
    bars
      .on('mouseenter', function(this: SVGRectElement, _event: MouseEvent, _d: TData) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.8)
          .attr('stroke', colors.text)
          .attr('stroke-width', 1);
        
        // Show tooltip (would be implemented with a tooltip component)
        // this._showTooltip(event, d);
      })
      .on('mouseleave', function(this: SVGRectElement, _event: MouseEvent, _d: TData) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke', 'none');
        
        // Hide tooltip
        // this._hideTooltip();
      });
  }

  private _addClickInteractions(
    bars: d3.Selection<SVGRectElement, TData, SVGGElement, unknown>
  ): void {
    bars.on('click', (_event: MouseEvent, _d: TData) => {
      // Emit click event (would be handled by the chart engine)
      // console.log('Bar clicked:', d);
    });
  }

  private _addAccessibilityAttributes(
    bars: d3.Selection<SVGRectElement, TData, SVGGElement, unknown>
  ): void {
    const { dataMapping } = this._config;
    
    bars
      .attr('role', 'graphics-symbol')
      .attr('aria-roledescription', 'bar')
      .attr('aria-label', (d: TData) => {
        const xValue = d[dataMapping.x];
        const yValue = d[dataMapping.y];
        return `${xValue}: ${yValue}`;
      })
      .attr('tabindex', this._config.accessibility.keyboardNavigation ? 0 : -1);

    if (this._config.accessibility.keyboardNavigation) {
      bars.on('keydown', (event: KeyboardEvent, d: TData) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          // Trigger click event
          (bars as any).dispatch('click', { detail: d });
        }
      });
    }
  }
}
