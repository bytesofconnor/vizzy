import { afterEach, describe, expect, it } from 'vitest';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import {
  SAMPLE_REVENUE,
  barConfig,
  createContainer,
  lineConfig,
  scatterConfig,
} from './fixtures';

describe('VizzyChartEngine', () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const el of containers) {
      el.remove();
    }
    containers.length = 0;
  });

  function engine(config = barConfig(), data = SAMPLE_REVENUE) {
    const el = createContainer();
    containers.push(el);
    return new VizzyChartEngine(el, config, data);
  }

  it('renders a bar chart as SVG rects', async () => {
    const chart = engine();
    await chart.render();
    const svg = chart.container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(chart.container.querySelectorAll('rect.bar').length).toBe(SAMPLE_REVENUE.length);
  });

  it('renders a line chart path', async () => {
    const chart = engine(lineConfig());
    await chart.render();
    expect(chart.container.querySelector('svg')).toBeTruthy();
    expect(chart.container.querySelectorAll('path.line').length).toBeGreaterThan(0);
    expect(chart.container.querySelector('path.line')?.getAttribute('d')).toMatch(/\d/);
  });

  it('renders a scatter plot as circles', async () => {
    const chart = engine(scatterConfig());
    await chart.render();
    expect(chart.container.querySelectorAll('circle.point').length).toBe(SAMPLE_REVENUE.length);
  });

  it('renders empty data without throwing', async () => {
    const chart = engine(barConfig(), []);
    await expect(chart.render()).resolves.toBeUndefined();
    expect(chart.container.querySelector('svg')).toBeTruthy();
    expect(chart.container.querySelectorAll('rect.bar').length).toBe(0);
  });

  it('updates data and redraws', async () => {
    const chart = engine();
    await chart.render();
    await chart.update(SAMPLE_REVENUE.slice(0, 2));
    expect(chart.data).toHaveLength(2);
    expect(chart.container.querySelectorAll('rect.bar').length).toBe(2);
  });

  it('destroy removes svg and a second destroy is safe', async () => {
    const chart = engine();
    await chart.render();
    chart.destroy();
    expect(chart.container.querySelector('svg')).toBeNull();
    expect(() => chart.destroy()).not.toThrow();
  });

  it('rejects a missing container', () => {
    expect(() => new VizzyChartEngine('#missing-vizzy', barConfig(), SAMPLE_REVENUE)).toThrow(
      /Container element/
    );
  });

  it('serializes a standalone SVG string', async () => {
    const chart = engine();
    await chart.render();
    const markup = chart.toSVG();
    expect(markup).toContain('<svg');
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('rect');
  });

  it('rejects an invalid config', () => {
    const el = createContainer();
    containers.push(el);
    expect(() => new VizzyChartEngine(el, { nope: true }, SAMPLE_REVENUE)).toThrow();
  });
});
