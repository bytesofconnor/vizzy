import * as d3 from 'd3';
import { ChartConfig, DataPoint, VizzyError } from '../types';
import { ScaleManager } from '../components/ScaleManager';
import { RenderEngine, RenderContext } from '../components/RenderEngine';
import { DataProcessor, ProcessedData } from '../components/DataProcessor';

export class LineChart<TData extends DataPoint = DataPoint> {
  private _config: ChartConfig;
  private _scaleManager!: ScaleManager;
  private _renderEngine!: RenderEngine;
  private _dataProcessor: DataProcessor<TData>;
  private _processedData: ProcessedData<TData> | null = null;

  constructor(config: ChartConfig) {
    this._config = config;
    this._dataProcessor = new DataProcessor(config);
    
    // Validate that this is a line chart config
    if (config.chart.type !== 'line') {
      throw new VizzyError(
        'INVALID_CHART_TYPE',
        'LineChart can only render line chart configurations',
        { expectedType: 'line', actualType: config.chart.type }
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
      
      // Sort numeric / time x. Leave categorical x in the given row order.
      this._processedData.processed.sort((a, b) => {
        const aVal = a[this._config.dataMapping.x];
        const bVal = b[this._config.dataMapping.x];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }

        if (aVal instanceof Date && bVal instanceof Date) {
          return aVal.getTime() - bVal.getTime();
        }

        return 0;
      });
      
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
      await this._renderLines(context);
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
        'LINE_CHART_RENDER_ERROR',
        'Failed to render line chart',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async _renderLines(context: RenderContext): Promise<void> {
    if (!context.svg || !this._processedData) return;

    const { svg, dimensions: _dimensions, config } = context;
    const { margin } = config.dimensions;
    const chartConfig = config.chart as any; // Line chart specific config
    
    // Create lines group
    const linesGroup = svg.select('.lines-group').empty()
      ? svg.append('g').attr('class', 'lines-group')
      : svg.select('.lines-group');

    linesGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Group data by color field if present
    const colorField = config.dataMapping.color;
    const groupedData = colorField 
      ? this._groupDataByField(this._processedData.processed, colorField)
      : [{ key: 'default', values: this._processedData.processed }];

    // Render each line group
    for (const group of groupedData) {
      await this._renderLineGroup(linesGroup as any, group, chartConfig);
    }
  }

  private _groupDataByField(data: TData[], field: string): Array<{ key: string; values: TData[] }> {
    const groups = new Map<string, TData[]>();
    
    for (const item of data) {
      const key = String(item[field] || 'default');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const group = groups.get(key);
      if (group) {
        group.push(item);
      }
    }
    
    return Array.from(groups.entries()).map(([key, values]) => ({ key, values }));
  }

  private async _renderLineGroup(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    lineData: { key: string; values: TData[] },
    chartConfig: any
  ): Promise<void> {
    const { dataMapping, colors, animation } = this._config;
    
    // Create line generator
    const line = d3.line<TData>()
      .x((d: TData) => this._scaleManager.getXValue(d[dataMapping.x]))
      .y((d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
      .curve(this._getCurveFunction(chartConfig.curve));

    // Create area generator if area is enabled
    const area = chartConfig.area ? d3.area<TData>()
      .x((d: TData) => this._scaleManager.getXValue(d[dataMapping.x]))
      .y0(this._scaleManager.getYValue(0))
      .y1((d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
      .curve(this._getCurveFunction(chartConfig.curve))
      : null;

    const lineColor = dataMapping.color 
      ? this._scaleManager.getColorValue(lineData.key)
      : colors.primary;

    // Render area if enabled
    if (area && chartConfig.area) {
      let areaPath = group.select(`.area-${lineData.key}`);
      
      if (areaPath.empty()) {
        areaPath = group.append('path')
          .attr('class', `area area-${lineData.key}`)
          .attr('fill', this._areaFill(group, lineData.key))
          .attr('opacity', 1)
          .attr('d', area(lineData.values));
      } else {
        areaPath.attr('fill', this._areaFill(group, lineData.key)).attr('opacity', 1);
        if (animation.enabled) {
          areaPath
            .transition()
            .duration(animation.duration)
            .attr('d', area(lineData.values));
        } else {
          areaPath.attr('d', area(lineData.values));
        }
      }
    }

    // Render line
    let linePath = group.select(`.line-${lineData.key}`);
    
    if (linePath.empty()) {
      linePath = group.append('path')
        .attr('class', `line line-${lineData.key}`)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', chartConfig.strokeWidth || 1.5)
        .attr('stroke-linejoin', 'miter')
        .attr('stroke-linecap', 'butt');

      if (animation.enabled) {
        const totalLength = (linePath.node() as SVGPathElement)?.getTotalLength() || 0;
        linePath
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .attr('d', line(lineData.values))
          .transition()
          .duration(animation.duration)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      } else {
        linePath.attr('d', line(lineData.values));
      }
    } else {
      if (animation.enabled) {
        linePath
          .transition()
          .duration(animation.duration)
          .attr('d', line(lineData.values));
      } else {
        linePath.attr('d', line(lineData.values));
      }
    }

    if (chartConfig.showPoints) {
      await this._renderPoints(group, lineData, lineColor, chartConfig);
    }

    const inflection = this._findInflection(lineData.values);
    if (inflection) {
      this._renderInflection(group, inflection, lineColor);
    }
    this._renderEndCap(group, lineData, lineColor, chartConfig, !inflection);

    // Add interactions
    if (this._config.interaction.hover) {
      this._addLineInteractions(linePath as any, lineData);
    }

    // Add accessibility
    if (this._config.accessibility.enabled) {
      this._addLineAccessibility(linePath as any, lineData);
    }
  }

  private async _renderPoints(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    lineData: { key: string; values: TData[] },
    color: string,
    chartConfig: any
  ): Promise<void> {
    const { dataMapping, animation } = this._config;
    const pointRadius = chartConfig.pointRadius || 4;

    // Bind data to points
    const points = group.selectAll(`.point-${lineData.key}`)
      .data(lineData.values, (d: any) => d[dataMapping.x]);

    // Remove old points
    points.exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .attr('r', 0)
      .remove();

    // Add new points
    const pointsEnter = points.enter()
      .append('circle')
      .attr('class', `point point-${lineData.key}`)
      .attr('cx', (d: TData) => this._scaleManager.getXValue(d[dataMapping.x]))
      .attr('cy', (d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
      .attr('r', 0)
      .attr('fill', color)
      .attr('stroke', 'none');

    // Update all points
    const pointsUpdate = pointsEnter.merge(points as any);

    if (animation.enabled) {
      pointsUpdate
        .transition()
        .duration(animation.duration)
        .delay((d, i) => i * (animation.stagger / 2))
        .attr('cx', (d: TData) => this._scaleManager.getXValue(d[dataMapping.x]))
        .attr('cy', (d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
        .attr('r', pointRadius);
    } else {
      pointsUpdate
        .attr('cx', (d: TData) => this._scaleManager.getXValue(d[dataMapping.x]))
        .attr('cy', (d: TData) => this._scaleManager.getYValue(d[dataMapping.y]))
        .attr('r', pointRadius);
    }

    // Add point interactions
    if (this._config.interaction.hover) {
      this._addPointInteractions(pointsUpdate);
    }

    // Add point accessibility
    if (this._config.accessibility.enabled) {
      this._addPointAccessibility(pointsUpdate);
    }
  }

  private _areaFill(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    key: string
  ): string {
    const svgEl = group.node()?.ownerSVGElement;
    if (!svgEl) {
      return this._config.colors.primary;
    }

    const uid = (svgEl.getAttribute('id') || 'chart').replace(/[^a-zA-Z0-9_-]/g, '');
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
    const gid = `vizzy-area-${uid}-${safeKey}`;
    const root = d3.select(svgEl);
    const defs = root.select('defs').empty()
      ? root.insert('defs', ':first-child')
      : root.select('defs');

    if (defs.select(`#${gid}`).empty()) {
      const gradient = defs.append('linearGradient')
        .attr('id', gid)
        .attr('gradientUnits', 'objectBoundingBox')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 1);
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', this._config.colors.primary)
        .attr('stop-opacity', 0.16);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', this._config.colors.primary)
        .attr('stop-opacity', 0);
    }

    return `url(#${gid})`;
  }

  private _findInflection(values: TData[]): TData | null {
    if (values.length < 3) {
      return null;
    }

    const field = this._config.dataMapping.y;
    const ys = values.map((row) => Number(row[field]));
    const span = Math.max(...ys) - Math.min(...ys);
    if (span <= 0) {
      return null;
    }

    let bestIndex = -1;
    let bestDelta = 0;
    let second = 0;
    for (let i = 1; i < ys.length; i += 1) {
      const current = ys[i];
      const previous = ys[i - 1];
      if (current === undefined || previous === undefined) {
        continue;
      }
      const delta = current - previous;
      if (delta > bestDelta) {
        second = bestDelta;
        bestDelta = delta;
        bestIndex = i;
      } else if (delta > second) {
        second = delta;
      }
    }

    if (bestIndex < 0 || bestDelta < span * 0.28) {
      return null;
    }
    if (second > 0 && bestDelta < second * 1.45) {
      return null;
    }

    return values[bestIndex] ?? null;
  }

  private _renderInflection(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    beat: TData,
    color: string
  ): void {
    const scales = this._scaleManager.getScales();
    if (!scales) {
      return;
    }

    const { dataMapping, colors } = this._config;
    const x = this._scaleManager.getXValue(beat[dataMapping.x]);
    const y = this._scaleManager.getYValue(beat[dataMapping.y]);
    const y0 = this._scaleManager.getYValue(0);
    const yTop = Math.min(...(scales.y.range() as number[]));

    group.selectAll('.inflection-rule').data([beat]).join('line')
      .attr('class', 'inflection-rule')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', yTop)
      .attr('y2', y0)
      .attr('stroke', colors.text)
      .attr('stroke-opacity', 0.14)
      .attr('stroke-width', 1);

    group.selectAll('.inflection-dot').data([beat]).join('circle')
      .attr('class', 'inflection-dot')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 3.25)
      .attr('fill', color)
      .attr('stroke', 'none');

    group.selectAll('.inflection-label').data([beat]).join('text')
      .attr('class', 'inflection-label')
      .attr('x', x)
      .attr('y', y - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .style('font-size', '12px')
      .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
      .text(String(beat[dataMapping.y]));
  }

  private _renderEndCap(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    lineData: { key: string; values: TData[] },
    color: string,
    chartConfig: { pointRadius?: number },
    withLabel: boolean
  ): void {
    const last = lineData.values[lineData.values.length - 1];
    if (!last) {
      return;
    }

    const { dataMapping } = this._config;
    const x = this._scaleManager.getXValue(last[dataMapping.x]);
    const y = this._scaleManager.getYValue(last[dataMapping.y]);
    const value = last[dataMapping.y];

    group.selectAll(`.end-cap-${lineData.key}`).data([last]).join('circle')
      .attr('class', `end-cap end-cap-${lineData.key}`)
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', chartConfig.pointRadius ?? 3)
      .attr('fill', color)
      .attr('stroke', 'none');

    const labels = group.selectAll(`.end-label-${lineData.key}`).data(withLabel ? [last] : []);
    labels.exit().remove();
    labels.join('text')
      .attr('class', `end-label end-label-${lineData.key}`)
      .attr('x', x)
      .attr('y', y - 11)
      .attr('text-anchor', 'middle')
      .attr('fill', this._config.colors.text)
      .style('font-size', '12px')
      .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
      .text(String(value));
  }

  private _getCurveFunction(curveType: string): d3.CurveFactory {
    switch (curveType) {
      case 'linear':
        return d3.curveLinear;
      case 'monotone':
        return d3.curveMonotoneX;
      case 'cardinal':
        return d3.curveCardinal;
      case 'basis':
        return d3.curveBasis;
      case 'step':
        return d3.curveStep;
      default:
        return d3.curveMonotoneX;
    }
  }

  private _addLineInteractions(
    line: d3.Selection<SVGPathElement, unknown, SVGGElement, unknown>,
    _lineData: { key: string; values: TData[] }
  ): void {
    const { colors: _colors } = this._config;
    
    line
      .on('mouseenter', function(_event, _d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke-width', 4);
      })
      .on('mouseleave', function(_event, _d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke-width', 2);
      });
  }

  private _addPointInteractions(
    points: d3.Selection<SVGCircleElement, TData, SVGGElement, unknown>
  ): void {
    points
      .on('mouseenter', function(_event, _d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 6)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function(_event, _d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 4)
          .attr('stroke-width', 2);
      });
  }

  private _addLineAccessibility(
    line: d3.Selection<SVGPathElement, unknown, SVGGElement, unknown>,
    lineData: { key: string; values: TData[] }
  ): void {
    line
      .attr('role', 'graphics-symbol')
      .attr('aria-roledescription', 'line')
      .attr('aria-label', `Line chart: ${lineData.key}`)
      .attr('tabindex', this._config.accessibility.keyboardNavigation ? 0 : -1);
  }

  private _addPointAccessibility(
    points: d3.Selection<SVGCircleElement, TData, SVGGElement, unknown>
  ): void {
    const { dataMapping } = this._config;
    
    points
      .attr('role', 'graphics-symbol')
      .attr('aria-roledescription', 'point')
      .attr('aria-label', (d: TData) => {
        const xValue = d[dataMapping.x];
        const yValue = d[dataMapping.y];
        return `Point: ${xValue}, ${yValue}`;
      })
      .attr('tabindex', this._config.accessibility.keyboardNavigation ? 0 : -1);
  }
}
