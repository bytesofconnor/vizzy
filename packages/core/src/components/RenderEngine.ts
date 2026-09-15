import * as d3 from 'd3';
import { looksSequentialX, rotatedTickDepth, shortCategoryNames, ticksFit, type XTickRotate } from '../layout';
import { ChartConfig, RenderStrategy, VizzyError } from '../types';
import { ScaleSystem, ScaleDimensions } from './ScaleManager';

export interface RenderContext {
  svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  container: HTMLElement;
  dimensions: ScaleDimensions;
  scales: ScaleSystem;
  config: ChartConfig;
}

export interface RenderOptions {
  animate?: boolean;
  duration?: number;
  easing?: string;
}

/** Resvg drops regular spaces in SVG text. Keep labels readable on the PNG. */
function paintAxisLabel(label: string): string {
  return label.replace(/ /g, '\u00A0');
}

function wrapBandName(name: string, maxChars: number): string[] {
  const limit = Math.max(4, maxChars);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [name];
  }

  const joined = words.join(' ');
  const target = words.length >= 3
    ? Math.min(limit, Math.max(12, Math.ceil(joined.length * 0.55)))
    : limit;

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= target) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 3);
}

function formatYTick(n: number, domain: [number, number]): string {
  if (!Number.isFinite(n)) {
    return '';
  }
  const yearAxis = domain[0] >= 1000 && domain[1] <= 2100 && domain[1] - domain[0] < 800;
  if (yearAxis) {
    return String(Math.round(n));
  }
  if (Math.abs(n) >= 10_000) {
    return d3.format('~s')(n).replace('G', 'B');
  }
  if (Math.abs(n) >= 1000) {
    return d3.format(',')(n);
  }
  return Number.isInteger(n) ? String(n) : d3.format('.1f')(n);
}

export class RenderEngine {
  private _strategy: RenderStrategy;
  private _config: ChartConfig;
  private _context: RenderContext | null = null;

  constructor(strategy: RenderStrategy, config: ChartConfig) {
    this._strategy = strategy;
    this._config = config;
  }

  public setContext(context: RenderContext): void {
    this._context = context;
  }

  public getContext(): RenderContext | null {
    return this._context;
  }

  public async renderAxes(options: RenderOptions = {}): Promise<void> {
    if (!this._context) {
      throw new VizzyError('RENDER_CONTEXT_MISSING', 'Render context must be set before rendering');
    }

    const { config, scales: _scales, dimensions: _dimensions } = this._context;
    
    if (!config.axes.x.show && !config.axes.y.show) {
      return;
    }

    if (this._strategy === 'svg') {
      await this._renderAxesSVG(options);
    } else {
      await this._renderAxesCanvas(options);
    }
  }

  public async renderGrid(options: RenderOptions = {}): Promise<void> {
    if (!this._context) {
      throw new VizzyError('RENDER_CONTEXT_MISSING', 'Render context must be set before rendering');
    }

    const { config } = this._context;
    
    if (!config.axes.x.grid && !config.axes.y.grid) {
      return;
    }

    if (this._strategy === 'svg') {
      await this._renderGridSVG(options);
    } else {
      await this._renderGridCanvas(options);
    }
  }

  public async renderLegend(legendData: Array<{ label: string; color: string }>, options: RenderOptions = {}): Promise<void> {
    if (!this._context) {
      throw new VizzyError('RENDER_CONTEXT_MISSING', 'Render context must be set before rendering');
    }

    const { config } = this._context;
    
    if (!config.legend.show || legendData.length === 0) {
      return;
    }

    if (this._strategy === 'svg') {
      await this._renderLegendSVG(legendData, options);
    } else {
      await this._renderLegendCanvas(legendData, options);
    }
  }

  private async _renderAxesSVG(options: RenderOptions): Promise<void> {
    if (!this._context?.svg) return;

    const { svg, scales, dimensions, config } = this._context;
    const { margin } = config.dimensions;

    // Create axes group
    const axesGroup = svg.select('.axes-group').empty() 
      ? svg.append('g').attr('class', 'axes-group')
      : svg.select('.axes-group');

    // X Axis
    if (config.axes.x.show) {
      const xAxis = d3.axisBottom(scales.x as any).tickSize(0).tickPadding(14);
      
      if (config.axes.x.tickCount) {
        xAxis.ticks(config.axes.x.tickCount);
      }

      let xAxisGroup = axesGroup.select('.x-axis');
      if (xAxisGroup.empty()) {
        xAxisGroup = axesGroup.append('g').attr('class', 'x-axis');
      }

      xAxisGroup
        .attr('transform', `translate(${margin.left}, ${margin.top + dimensions.innerHeight})`)
        .style('color', config.colors.text);

      if (options.animate && config.animation.enabled) {
        xAxisGroup
          .transition()
          .duration(options.duration ?? config.animation.duration)
          .call(xAxis as any);
      } else {
        xAxisGroup.call(xAxis as any);
      }

      this._polishAxis(xAxisGroup, config.colors.text, 'x');
      const ticks = this._layoutXTicks(xAxisGroup, scales.x);

      // X Axis Label
      if (config.axes.x.label) {
        let xLabel = xAxisGroup.select('.axis-label');
        if (xLabel.empty()) {
          xLabel = xAxisGroup.append('text').attr('class', 'axis-label');
        }

        xLabel
          .attr('x', dimensions.innerWidth / 2)
          .attr('y', ticks.titleY)
          .attr('text-anchor', 'middle')
          .style('fill', config.colors.text)
          .style('opacity', 0.62)
          .style('font-size', '11px')
          .style('letter-spacing', '0.06em')
          .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
          .text(paintAxisLabel(config.axes.x.label));
      }
    }

    // Y Axis
    if (config.axes.y.show) {
      const yAxis = d3.axisLeft(scales.y as any)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((value) => formatYTick(Number(value), scales.y.domain() as [number, number]));
      
      if (config.axes.y.tickCount) {
        yAxis.ticks(config.axes.y.tickCount);
      }

      let yAxisGroup = axesGroup.select('.y-axis');
      if (yAxisGroup.empty()) {
        yAxisGroup = axesGroup.append('g').attr('class', 'y-axis');
      }

      yAxisGroup
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .style('color', config.colors.text);

      if (options.animate && config.animation.enabled) {
        yAxisGroup
          .transition()
          .duration(options.duration ?? config.animation.duration)
          .call(yAxis as any);
      } else {
        yAxisGroup.call(yAxis as any);
      }

      this._polishAxis(yAxisGroup, config.colors.text, 'y');

      // Y Axis Label
      if (config.axes.y.label) {
        let yLabel = yAxisGroup.select('.axis-label');
        if (yLabel.empty()) {
          yLabel = yAxisGroup.append('text').attr('class', 'axis-label');
        }

        yLabel
          .attr('transform', 'rotate(-90)')
          .attr('x', -dimensions.innerHeight / 2)
          .attr('y', -48)
          .attr('text-anchor', 'middle')
          .style('fill', config.colors.text)
          .style('opacity', 0.62)
          .style('font-size', '11px')
          .style('letter-spacing', '0.06em')
          .style('font-family', 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace')
          .text(paintAxisLabel(config.axes.y.label));
      }
    }
  }

  private async _renderAxesCanvas(_options: RenderOptions): Promise<void> {
    if (!this._context?.context) return;

    const { context, scales, dimensions, config } = this._context;
    const { margin } = config.dimensions;

    context.save();
    context.strokeStyle = config.colors.text;
    context.fillStyle = config.colors.text;
    context.font = '12px sans-serif';
    context.lineWidth = 1;

    // X Axis
    if (config.axes.x.show) {
      const y = margin.top + dimensions.innerHeight;
      
      // Axis line
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + dimensions.innerWidth, y);
      context.stroke();

      // Ticks and labels
      if ('bandwidth' in scales.x) {
        // Band scale
        const bandScale = scales.x as d3.ScaleBand<string>;
        bandScale.domain().forEach(value => {
          const x = margin.left + (bandScale(value) ?? 0) + bandScale.bandwidth() / 2;
          
          // Tick
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x, y + 5);
          context.stroke();
          
          // Label
          context.textAlign = 'center';
          context.fillText(value, x, y + 18);
        });
      } else {
        // Linear scale
        const linearScale = scales.x as d3.ScaleLinear<number, number>;
        const ticks = linearScale.ticks(config.axes.x.tickCount ?? 5);
        
        ticks.forEach(value => {
          const x = margin.left + linearScale(value);
          
          // Tick
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x, y + 5);
          context.stroke();
          
          // Label
          context.textAlign = 'center';
          context.fillText(String(value), x, y + 18);
        });
      }

      // X Axis Label
      if (config.axes.x.label) {
        context.textAlign = 'center';
        context.font = '14px sans-serif';
        context.fillText(
          config.axes.x.label,
          margin.left + dimensions.innerWidth / 2,
          y + 40
        );
      }
    }

    // Y Axis
    if (config.axes.y.show) {
      const x = margin.left;
      
      // Axis line
      context.beginPath();
      context.moveTo(x, margin.top);
      context.lineTo(x, margin.top + dimensions.innerHeight);
      context.stroke();

      // Ticks and labels
      const linearScale = scales.y as d3.ScaleLinear<number, number>;
      const ticks = linearScale.ticks(config.axes.y.tickCount ?? 5);
      
      ticks.forEach(value => {
        const y = margin.top + linearScale(value);
        
        // Tick
        context.beginPath();
        context.moveTo(x - 5, y);
        context.lineTo(x, y);
        context.stroke();
        
        // Label
        context.textAlign = 'right';
        context.fillText(String(value), x - 8, y + 4);
      });

      // Y Axis Label
      if (config.axes.y.label) {
        context.save();
        context.translate(x - 40, margin.top + dimensions.innerHeight / 2);
        context.rotate(-Math.PI / 2);
        context.textAlign = 'center';
        context.font = '14px sans-serif';
        context.fillText(config.axes.y.label, 0, 0);
        context.restore();
      }
    }

    context.restore();
  }

  private async _renderGridSVG(options: RenderOptions): Promise<void> {
    if (!this._context?.svg) return;

    const { svg, scales, dimensions, config } = this._context;
    const { margin } = config.dimensions;

    // Create grid group
    const gridGroup = svg.select('.grid-group').empty()
      ? svg.insert('g', ':first-child').attr('class', 'grid-group')
      : svg.select('.grid-group');

    gridGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X Grid
    if (config.axes.x.grid) {
      let xGrid = gridGroup.select('.x-grid');
      if (xGrid.empty()) {
        xGrid = gridGroup.append('g').attr('class', 'x-grid');
      }

      const xAxis = d3.axisBottom(scales.x as any)
        .tickSize(-dimensions.innerHeight)
        .tickFormat(() => '');

      xGrid
        .attr('transform', `translate(0, ${dimensions.innerHeight})`)
        .style('opacity', config.axes.x.gridOpacity)
        .style('color', config.colors.grid);

      if (options.animate && config.animation.enabled) {
        xGrid
          .transition()
          .duration(options.duration ?? config.animation.duration)
          .call(xAxis as any);
      } else {
        xGrid.call(xAxis as any);
      }
    }

    // Y Grid
    if (config.axes.y.grid) {
      let yGrid = gridGroup.select('.y-grid');
      if (yGrid.empty()) {
        yGrid = gridGroup.append('g').attr('class', 'y-grid');
      }

      const yAxis = d3.axisLeft(scales.y as any)
        .tickSize(-dimensions.innerWidth)
        .tickFormat(() => '');

      yGrid
        .style('opacity', config.axes.y.gridOpacity)
        .style('color', config.colors.grid);

      if (options.animate && config.animation.enabled) {
        yGrid
          .transition()
          .duration(options.duration ?? config.animation.duration)
          .call(yAxis as any);
      } else {
        yGrid.call(yAxis as any);
      }

      yGrid.select('.domain').attr('stroke', 'none');
      yGrid.selectAll('.tick')
        .filter((value) => Number(value) === 0)
        .remove();
      yGrid.selectAll('line')
        .attr('stroke', config.colors.grid)
        .attr('stroke-width', 1);
    }
  }

  private async _renderGridCanvas(_options: RenderOptions): Promise<void> {
    if (!this._context?.context) return;

    const { context, scales, dimensions, config } = this._context;
    const { margin } = config.dimensions;

    context.save();
    context.strokeStyle = config.colors.grid;
    context.globalAlpha = config.axes.x.gridOpacity;
    context.lineWidth = 1;

    // X Grid
    if (config.axes.x.grid) {
      if ('bandwidth' in scales.x) {
        const bandScale = scales.x as d3.ScaleBand<string>;
        bandScale.domain().forEach(value => {
          const x = margin.left + (bandScale(value) ?? 0);
          context.beginPath();
          context.moveTo(x, margin.top);
          context.lineTo(x, margin.top + dimensions.innerHeight);
          context.stroke();
        });
      } else {
        const linearScale = scales.x as d3.ScaleLinear<number, number>;
        const ticks = linearScale.ticks();
        
        ticks.forEach(value => {
          const x = margin.left + linearScale(value);
          context.beginPath();
          context.moveTo(x, margin.top);
          context.lineTo(x, margin.top + dimensions.innerHeight);
          context.stroke();
        });
      }
    }

    // Y Grid
    if (config.axes.y.grid) {
      context.globalAlpha = config.axes.y.gridOpacity;
      const linearScale = scales.y as d3.ScaleLinear<number, number>;
      const ticks = linearScale.ticks();
      
      ticks.forEach(value => {
        const y = margin.top + linearScale(value);
        context.beginPath();
        context.moveTo(margin.left, y);
        context.lineTo(margin.left + dimensions.innerWidth, y);
        context.stroke();
      });
    }

    context.restore();
  }

  private async _renderLegendSVG(legendData: Array<{ label: string; color: string }>, _options: RenderOptions): Promise<void> {
    if (!this._context?.svg) return;

    const { svg, dimensions, config } = this._context;
    const { legend } = config;

    // Create legend group
    let legendGroup = svg.select('.legend-group');
    if (legendGroup.empty()) {
      legendGroup = svg.append('g').attr('class', 'legend-group');
    }

    // Calculate legend position
    const legendX = this._calculateLegendX(dimensions, legend.position);
    const legendY = this._calculateLegendY(dimensions, legend.position);

    legendGroup.attr('transform', `translate(${legendX}, ${legendY})`);

    // Render legend items
    const items = legendGroup.selectAll('.legend-item')
      .data(legendData, (d: any) => d.label);

    const itemsEnter = items.enter()
      .append('g')
      .attr('class', 'legend-item');

    // Add symbols
    itemsEnter.append('rect')
      .attr('class', 'legend-symbol')
      .attr('width', legend.symbolSize)
      .attr('height', legend.symbolSize);

    // Add labels
    itemsEnter.append('text')
      .attr('class', 'legend-label')
      .attr('x', legend.symbolSize + 5)
      .attr('y', legend.symbolSize / 2)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', config.colors.text);

    // Update all items
    const itemsUpdate = itemsEnter.merge(items as any);

    itemsUpdate
      .attr('transform', (d, i) => {
        if (legend.orientation === 'horizontal') {
          return `translate(${i * 100}, 0)`;
        } else {
          return `translate(0, ${i * (legend.symbolSize + legend.itemSpacing)})`;
        }
      });

    itemsUpdate.select('.legend-symbol')
      .attr('fill', d => d.color);

    itemsUpdate.select('.legend-label')
      .text(d => d.label);

    // Remove old items
    items.exit().remove();
  }

  private async _renderLegendCanvas(legendData: Array<{ label: string; color: string }>, _options: RenderOptions): Promise<void> {
    if (!this._context?.context) return;

    const { context, dimensions, config } = this._context;
    const { legend } = config;

    context.save();
    context.font = '12px sans-serif';
    context.fillStyle = config.colors.text;

    const legendX = this._calculateLegendX(dimensions, legend.position);
    const legendY = this._calculateLegendY(dimensions, legend.position);

    legendData.forEach((item, i) => {
      let x = legendX;
      let y = legendY;

      if (legend.orientation === 'horizontal') {
        x += i * 100;
      } else {
        y += i * (legend.symbolSize + legend.itemSpacing);
      }

      // Draw symbol
      context.fillStyle = item.color;
      context.fillRect(x, y, legend.symbolSize, legend.symbolSize);

      // Draw label
      context.fillStyle = config.colors.text;
      context.fillText(item.label, x + legend.symbolSize + 5, y + legend.symbolSize / 2 + 4);
    });

    context.restore();
  }

  /**
   * Time-like axes can skip ticks. Named categories cannot — rotate them so every bar stays labeled.
   */
  private _layoutXTicks(
    group: d3.Selection<d3.BaseType | SVGGElement, unknown, null | SVGGElement, unknown>,
    scale: ScaleSystem['x']
  ): { rotate: XTickRotate; titleY: number } {
    const ticks = group.selectAll<SVGGElement, unknown>('.tick').nodes();
    if (ticks.length === 0) {
      return { rotate: 0, titleY: 38 };
    }

    const raw = ticks.map((node) => {
      const text = node.querySelector('text');
      const name = (text?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const x = Number(/translate\(([-0-9.]+)/.exec(node.getAttribute('transform') ?? '')?.[1] ?? 0);
      return { node, name, x };
    });
    const labels = shortCategoryNames(raw.map((item) => item.name));
    const items = raw.map((item, index) => {
      const label = labels[index] ?? item.name;
      return { ...item, label, width: Math.max(label.length * 6.6, 10) };
    });

    const sequential = looksSequentialX(items.map((item) => item.name));
    const keep = items.map(() => true);
    if (sequential) {
      keep.fill(false);
      keep[0] = true;
      keep[items.length - 1] = true;
      let last = 0;
      for (let i = 1; i < items.length - 1; i += 1) {
        const end = items[items.length - 1]!;
        const current = items[i]!;
        const prev = items[last]!;
        const fitsPrev = current.x - prev.x >= prev.width / 2 + current.width / 2 + 14;
        const fitsEnd = end.x - current.x >= current.width / 2 + end.width / 2 + 14;
        if (fitsPrev && fitsEnd) {
          keep[i] = true;
          last = i;
        }
      }
    }

    const slot = 'bandwidth' in scale ? scale.bandwidth() + 10 : 80;
    const rotate = !sequential && items.length > 6 && !ticksFit(items, keep)
      ? (items.length > 12 || items.some((item) => item.label.length > 16) ? -65 : -40)
      : 0;

    let tallest = 1;
    const longest = items.reduce((max, item) => Math.max(max, item.label.length), 0);
    items.forEach((item, index) => {
      const tick = d3.select(item.node);
      if (!keep[index]) {
        tick.attr('opacity', 0).attr('aria-hidden', 'true');
        return;
      }
      tick.attr('opacity', 1).attr('aria-hidden', null);
      if (item.label !== item.name) {
        let tip = tick.select('title');
        if (tip.empty()) {
          tip = tick.append('title');
        }
        tip.text(item.name);
      }
      const text = tick.select('text');
      const wrap = rotate === 0 && item.label.includes(' ') && item.label.length * 7 > slot;
      const lines = wrap ? wrapBandName(item.label, Math.max(6, Math.floor(slot / 7))) : [item.label];
      tallest = Math.max(tallest, lines.length);
      text
        .text(null)
        .attr('text-anchor', rotate ? 'end' : 'middle')
        .attr('dx', rotate ? '-0.35em' : null)
        .attr('dy', rotate ? '0.35em' : null)
        .attr('transform', rotate ? `rotate(${rotate})` : null)
        .style('font-size', rotate ? '10px' : null)
        .style('letter-spacing', rotate ? '0' : null);
      lines.forEach((line, lineIndex) => {
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', rotate ? null : lineIndex === 0 ? '0.9em' : '1.15em')
          .text(paintAxisLabel(line));
      });
    });

    const tickDepth = rotate ? rotatedTickDepth(longest, rotate) : 18 + tallest * 16;
    return { rotate, titleY: tickDepth + 20 };
  }

  private _polishAxis(
    group: d3.Selection<d3.BaseType, unknown, null, undefined>,
    textColor: string,
    role: 'x' | 'y' = 'x'
  ): void {
    group.select('.domain').attr('stroke', 'none');
    group.selectAll('.tick line').attr('stroke', 'none');
    group.selectAll('.tick text')
      .style('fill', textColor)
      .style('opacity', role === 'x' ? 0.78 : 0.38)
      .style('font-size', role === 'x' ? '12px' : '10px')
      .style('letter-spacing', role === 'x' ? '0.02em' : '0')
      .style('font-family', role === 'x'
        ? 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace'
        : 'var(--font-sans), Archivo, Helvetica, sans-serif');
  }

  private _calculateLegendX(dimensions: ScaleDimensions, position: string): number {
    const { margin } = this._config.dimensions;
    
    switch (position) {
      case 'left':
        return 10;
      case 'right':
        return margin.left + dimensions.innerWidth + 20;
      case 'top':
      case 'bottom':
      default:
        return margin.left + dimensions.innerWidth / 2;
    }
  }

  private _calculateLegendY(dimensions: ScaleDimensions, position: string): number {
    const { margin } = this._config.dimensions;
    
    switch (position) {
      case 'top':
        return 10;
      case 'bottom':
        return margin.top + dimensions.innerHeight + 60;
      case 'left':
      case 'right':
      default:
        return margin.top + dimensions.innerHeight / 2;
    }
  }
}
