import * as d3 from 'd3';
import { barSpeak, seriesIsSketch, sketchFrame, type BarSpeak } from '../bar-reading';
import { bindChartTip, formatTipNumber, seriesTipLabel } from '../chart-tip';
import { formatDataValue } from '../format';
import { ChartConfig, DataPoint, VizzyError } from '../types';
import { ScaleManager } from '../components/ScaleManager';
import { RenderEngine, RenderContext } from '../components/RenderEngine';
import { DataProcessor, ProcessedData } from '../components/DataProcessor';

type Spoken<TData> = { row: TData; speak: BarSpeak };

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

  private _host: HTMLElement | null = null;

  public async render(
    context: RenderContext,
    data: TData[]
  ): Promise<void> {
    const frame = sketchFrame(this._config);
    context.config = frame;
    try {
      this._host = context.container;
      this._processedData = this._dataProcessor.process(data);

      this._scaleManager = new ScaleManager(frame, context.dimensions);
      const scales = this._scaleManager.createScales(this._processedData.domains);

      context.scales = scales;

      this._renderEngine = new RenderEngine('svg', frame);
      this._renderEngine.setContext(context);

      await this._renderEngine.renderGrid();
      await this._renderBars(context, frame);
      await this._renderEngine.renderAxes();

      if (frame.legend.show && this._processedData.statistics.colorStats) {
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

  private async _renderBars(context: RenderContext, frame: ChartConfig): Promise<void> {
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
      await this._renderSingleBars(barsGroup as any, this._processedData.processed, frame);
    } else if (chartConfig.grouping === 'grouped') {
      await this._renderGroupedBars(barsGroup as any, this._processedData.processed, frame);
    } else if (chartConfig.grouping === 'stacked') {
      await this._renderStackedBars(barsGroup as any, this._processedData.processed, frame);
    }
  }

  private async _renderSingleBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[],
    frame: ChartConfig
  ): Promise<void> {
    const { dataMapping, chart, colors, animation } = frame;
    const chartConfig = chart as { cornerRadius?: number };
    const spoken: Array<Spoken<TData>> = data.map((row) => ({
      row,
      speak: barSpeak(row[dataMapping.x], row[dataMapping.y], frame.source),
    }));
    const drawn = spoken.filter((item) => item.speak.mark !== 'none');
    const fillFor = (row: TData) => {
      if (dataMapping.color && row[dataMapping.color]) {
        return this._scaleManager.getColorValue(String(row[dataMapping.color]));
      }
      return colors.primary;
    };
    const barX = (row: TData) => {
      const xValue = this._scaleManager.getXValue(row[dataMapping.x]);
      const bandwidth = (this._scaleManager.getScales()?.x as { bandwidth?: () => number }).bandwidth?.() || 0;
      return xValue - bandwidth / 2;
    };
    const barWidth = () => {
      const scales = this._scaleManager.getScales();
      return (scales?.x as { bandwidth?: () => number }).bandwidth?.() || 20;
    };

    const bars = group.selectAll<SVGRectElement, Spoken<TData>>('.bar')
      .data(drawn, (item) => String(item.row[dataMapping.x]));

    bars.exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .attr('height', 0)
      .attr('y', this._plotFloor())
      .remove();

    const barsEnter = bars.enter()
      .append('rect')
      .attr('x', (item) => barX(item.row))
      .attr('y', this._plotFloor())
      .attr('width', barWidth)
      .attr('height', 0);

    const barsUpdate = barsEnter.merge(bars);

    barsUpdate
      .attr('class', (item) => (item.speak.mark === 'outline' ? 'bar bar-sketch' : 'bar'))
      .attr('fill', (item) => (item.speak.mark === 'outline' ? 'none' : fillFor(item.row)))
      .attr('stroke', (item) => (item.speak.mark === 'outline' ? fillFor(item.row) : 'none'))
      .attr('stroke-width', (item) => (item.speak.mark === 'outline' ? 1.5 : null))
      .attr('stroke-dasharray', (item) => (item.speak.mark === 'outline' ? '1.5 5' : null))
      .attr('rx', chartConfig.cornerRadius || 0)
      .attr('ry', chartConfig.cornerRadius || 0);

    if (animation.enabled) {
      barsUpdate
        .transition()
        .duration(animation.duration)
        .delay((_item, index) => index * animation.stagger)
        .ease(d3.easeQuadOut)
        .attr('x', (item) => barX(item.row))
        .attr('width', barWidth)
        .attr('y', (item) => this._scaleManager.getYValue(item.row[dataMapping.y]))
        .attr('height', (item) => this._barHeight(item.row[dataMapping.y]));
    } else {
      barsUpdate
        .attr('x', (item) => barX(item.row))
        .attr('width', barWidth)
        .attr('y', (item) => this._scaleManager.getYValue(item.row[dataMapping.y]))
        .attr('height', (item) => this._barHeight(item.row[dataMapping.y]));
    }

    if (frame.interaction.hover) {
      this._addHoverInteractions(barsUpdate, frame);
    }

    if (frame.accessibility.enabled) {
      this._addAccessibilityAttributes(barsUpdate, frame);
    }

    this._drawBaseline(group, frame);
    this._renderSlotCopy(group, spoken, frame);
    this._renderBarLabels(
      group,
      spoken
        .filter((item) => item.speak.mark === 'solid' && item.speak.glyph !== '0')
        .map((item) => item.row),
      frame
    );
  }

  private _renderSlotCopy(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    spoken: Array<Spoken<TData>>,
    frame: ChartConfig
  ): void {
    const { dataMapping, colors, accessibility } = frame;
    const blanks = spoken.filter((item) => item.speak.mark === 'none');
    const zeros = spoken.filter((item) => item.speak.glyph === '0');
    const mono = 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace';

    const blankSel = group
      .selectAll<SVGTextElement, Spoken<TData>>('.bar-blank')
      .data(blanks, (item) => String(item.row[dataMapping.x]));
    blankSel.exit().remove();
    const blankMerged = blankSel.enter().append('text').attr('class', 'bar-blank').merge(blankSel);
    blankMerged
      .attr('x', (item) => this._scaleManager.getXValue(item.row[dataMapping.x]))
      .attr('y', this._plotFloor() - 12)
      .attr('text-anchor', 'middle')
      .style('fill', colors.text)
      .style('font-size', '10px')
      .style('font-family', mono)
      .text((item) => item.speak.glyph ?? '');
    if (accessibility.enabled) {
      blankMerged.attr('aria-label', (item) => item.speak.aria);
    }

    const zeroSel = group
      .selectAll<SVGTextElement, Spoken<TData>>('.bar-zero')
      .data(zeros, (item) => String(item.row[dataMapping.x]));
    zeroSel.exit().remove();
    zeroSel
      .enter()
      .append('text')
      .attr('class', 'bar-zero')
      .merge(zeroSel)
      .attr('x', (item) => this._scaleManager.getXValue(item.row[dataMapping.x]))
      .attr('y', this._plotFloor() - 2)
      .attr('text-anchor', 'middle')
      .style('fill', colors.text)
      .style('font-size', '10px')
      .style('font-family', mono)
      .style('pointer-events', 'none')
      .text('0');

    const showStamp = seriesIsSketch(frame.source);
    const stamp = group.selectAll<SVGTextElement, number>('.bar-sketch-stamp').data(showStamp ? [0] : []);
    stamp.exit().remove();
    if (showStamp) {
      const range = (this._scaleManager.getScales()?.x.range() as [number, number] | undefined) ?? [0, 0];
      stamp
        .enter()
        .append('text')
        .attr('class', 'bar-sketch-stamp')
        .merge(stamp)
        .attr('x', (range[0] + range[1]) / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .style('fill', colors.text)
        .style('font-size', '11px')
        .style('letter-spacing', '0.08em')
        .style('font-family', mono)
        .style('pointer-events', 'none')
        .text('Unfinished');
    }
    this._bindBlankTips(blankMerged, frame);
  }

  private _bindBlankTips(
    nodes: d3.Selection<SVGTextElement, Spoken<TData>, SVGGElement, unknown>,
    frame: ChartConfig
  ): void {
    const host = this._host;
    if (!frame.interaction.hover || !host || frame.interaction.tooltip === false) {
      return;
    }
    const { dataMapping } = frame;
    nodes.each((item, index, list) => {
      const node = list[index];
      if (!node) {
        return;
      }
      bindChartTip(host, node, () => ({
        title: String(item.row[dataMapping.x] ?? ''),
        value: item.speak.tip,
      }));
    });
  }

  private async _renderGroupedBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[],
    frame: ChartConfig
  ): Promise<void> {
    await this._renderSingleBars(group, data, frame);
  }

  private async _renderStackedBars(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[],
    frame: ChartConfig
  ): Promise<void> {
    await this._renderSingleBars(group, data, frame);
  }

  private _renderBarLabels(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TData[],
    frame: ChartConfig
  ): void {
    const chartConfig = frame.chart as { showValues?: boolean; orientation?: string };
    if (!chartConfig.showValues || chartConfig.orientation === 'horizontal' || data.length > 14) {
      group.selectAll('.bar-label').remove();
      return;
    }

    const scales = this._scaleManager.getScales();
    if (!scales) {
      return;
    }

    const { dataMapping, colors } = frame;
    const domain = scales.y.domain() as [number, number];
    const labels = group.selectAll<SVGTextElement, TData>('.bar-label')
      .data(data, (d) => String(d[dataMapping.x]));

    labels.exit().remove();

    const merged = labels.enter()
      .append('text')
      .attr('class', 'bar-label')
      .merge(labels);

    merged
      .attr('x', (d) => this._scaleManager.getXValue(d[dataMapping.x]))
      .attr('y', (d) => {
        const height = this._barHeight(d[dataMapping.y]);
        if (height < 12) {
          return this._scaleManager.getYValue(d[dataMapping.y]) - 4;
        }
        return this._scaleManager.getYValue(d[dataMapping.y]) - 6;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .style('fill', colors.text)
      .style('opacity', (d) => (this._barHeight(d[dataMapping.y]) >= 12 ? 0.72 : 0))
      .style('font-size', '10px')
      .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
      .style('paint-order', 'stroke fill')
      .style('stroke', colors.background)
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .style('pointer-events', 'none')
      .text((d) => formatDataValue(Number(d[dataMapping.y]), domain));
  }

  private _drawBaseline(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    frame: ChartConfig
  ): void {
    const scales = this._scaleManager.getScales();
    if (!scales) {
      return;
    }

    const [x0, x1] = scales.x.range() as [number, number];
    const y0 = this._plotFloor();

    group.selectAll('.bar-baseline').data([0]).join('line')
      .attr('class', 'bar-baseline')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', y0)
      .attr('y2', y0)
      .attr('stroke', frame.colors.text)
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1);
  }

  private _plotFloor(): number {
    const scales = this._scaleManager.getScales();
    if (!scales || !('range' in scales.y)) {
      return 0;
    }
    const range = scales.y.range() as [number, number];
    return Math.max(range[0], range[1]);
  }

  private _barHeight(value: unknown): number {
    return Math.abs(this._scaleManager.getYValue(value) - this._plotFloor());
  }

  private _addHoverInteractions(
    bars: d3.Selection<SVGRectElement, Spoken<TData>, SVGGElement, unknown>,
    frame: ChartConfig
  ): void {
    const { colors, dataMapping, interaction } = frame;
    const host = this._host;
    const scales = this._scaleManager.getScales();
    const domain = (scales?.y.domain() as [number, number] | undefined) ?? [0, 1];
    const groupField = dataMapping.group ?? dataMapping.color;

    bars
      .style('cursor', 'default')
      .style('pointer-events', 'all')
      .on('mouseenter', function (this: SVGRectElement) {
        const node = d3.select(this);
        node.attr('opacity', 0.82);
        if (!this.classList.contains('bar-sketch')) {
          node.attr('stroke', colors.text).attr('stroke-width', 1);
        }
      })
      .on('mouseleave', function (this: SVGRectElement) {
        const node = d3.select(this);
        node.attr('opacity', 1);
        if (!this.classList.contains('bar-sketch')) {
          node.attr('stroke', 'none');
        }
      });

    if (!host || interaction.tooltip === false) {
      return;
    }

    bars.each((item, index, nodes) => {
      const node = nodes[index];
      if (!node) {
        return;
      }
      bindChartTip(host, node, () => ({
        title: String(item.row[dataMapping.x] ?? ''),
        value:
          item.speak.mark === 'solid'
            ? formatTipNumber(item.row[dataMapping.y], domain)
            : item.speak.tip,
        series: groupField ? seriesTipLabel(item.row[groupField]) : undefined,
      }));
    });
  }

  private _addAccessibilityAttributes(
    bars: d3.Selection<SVGRectElement, Spoken<TData>, SVGGElement, unknown>,
    frame: ChartConfig
  ): void {
    bars
      .attr('role', 'graphics-symbol')
      .attr('aria-roledescription', 'bar')
      .attr('aria-label', (item) => item.speak.aria)
      .attr('tabindex', frame.accessibility.keyboardNavigation ? 0 : -1);

    if (frame.accessibility.keyboardNavigation) {
      bars.on('keydown', (event: KeyboardEvent, item) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          (bars as any).dispatch('click', { detail: item.row });
        }
      });
    }
  }
}
