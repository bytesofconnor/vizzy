import { afterEach, describe, expect, it } from 'vitest';
import { validateChartConfig } from '../types';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import { createContainer } from './fixtures';

describe('multi-series lines', () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const el of containers) {
      el.remove();
    }
    containers.length = 0;
  });

  it('draws Netflix and Disney+ as two named lines', async () => {
    const el = createContainer();
    containers.push(el);
    const data = [
      { x: '2020', y: 200, series: 'Netflix' },
      { x: '2021', y: 220, series: 'Netflix' },
      { x: '2022', y: 230, series: 'Netflix' },
      { x: '2020', y: 70, series: 'Disney+' },
      { x: '2021', y: 110, series: 'Disney+' },
      { x: '2022', y: 150, series: 'Disney+' },
    ];
    const config = validateChartConfig({
      schemaVersion: 1,
      chart: { type: 'line', showPoints: false },
      dataMapping: { x: 'x', y: 'y', color: 'series' },
      legend: { show: true, position: 'top', orientation: 'horizontal' },
      dimensions: { width: 800, height: 400, margin: { top: 56, right: 40, bottom: 64, left: 48 } },
      animation: { enabled: false, duration: 0 },
      colors: {
        primary: '#121211',
        palette: ['#121211', '#6e6b64', '#8f8c84'],
      },
    });
    const chart = new VizzyChartEngine(el, config, data);
    await chart.render();
    expect(chart.container.querySelectorAll('path.line').length).toBe(2);
    const legend = chart.container.querySelectorAll('.legend-label');
    const labels = [...legend].map((node) => node.textContent);
    expect(labels).toContain('Netflix');
    expect(labels).toContain('Disney+');
  });
});