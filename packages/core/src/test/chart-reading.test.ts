import { afterEach, describe, expect, it } from 'vitest';
import { downsample } from '../../../resolve/src/window';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import { validateChartConfig } from '../types';
import { createContainer } from './fixtures';

const COUNTRIES = ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'];

function lineChart(data: Array<Record<string, unknown>>, width = 1100) {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type: 'line', showPoints: false },
    dataMapping: { x: 'x', y: 'y', ...(data.some((row) => row.series) ? { color: 'series' } : {}) },
    dimensions: { width, height: 420, margin: { top: 48, right: 148, bottom: 64, left: 56 } },
    animation: { enabled: false, duration: 0 },
    legend: { show: Boolean(data.some((row) => row.series)), position: 'top', orientation: 'horizontal' },
    colors: {
      primary: '#121211',
      palette: ['#121211', '#6e6b64', '#8f8c84'],
    },
  });
}

function tickLabels(root: ParentNode): Array<{ label: string; x: number }> {
  return [...root.querySelectorAll('.x-axis .tick')].map((tick) => ({
    label: (tick.querySelector('text')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    x: Number(/translate\(([-0-9.]+)/.exec(tick.getAttribute('transform') ?? '')?.[1] ?? 0),
  }));
}

function yearOf(label: string): number {
  const match = label.match(/((?:19|20)\d{2})/);
  return match?.[1] ? Number(match[1]) : Number.NaN;
}

describe('chart reading', () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const el of containers) {
      el.remove();
    }
    containers.length = 0;
  });

  it('draws a thinned seven-country annual line as one piece per country', async () => {
    const rows = COUNTRIES.flatMap((series, seriesIndex) =>
      Array.from({ length: 36 }, (_, offset) => {
        const year = 1990 + offset;
        const spike = series === 'United States' && year === 2007 ? 120000 : 0;
        return { x: String(year), y: 20000 + offset * 900 + seriesIndex * 3000 + spike, series };
      })
    );
    const slim = downsample(rows);
    const el = createContainer({ width: 1100, height: 420 });
    containers.push(el);
    const chart = new VizzyChartEngine(el, lineChart(slim), slim);
    await chart.render();
    const paths = [...chart.container.querySelectorAll('path.line')];
    expect(paths).toHaveLength(COUNTRIES.length);
    for (const path of paths) {
      expect(path.getAttribute('d')?.match(/M/g)).toHaveLength(1);
    }
    expect(chart.container.querySelectorAll('.inflection-label')).toHaveLength(0);
    const names = [...chart.container.querySelectorAll('.series-end-label')].map((node) => node.textContent);
    expect(names).toEqual(expect.arrayContaining(COUNTRIES));
  });

  it('plots newest-first rows, including a provisional year, from oldest to newest', async () => {
    const rows = [];
    for (let year = 2025; year >= 2004; year -= 1) {
      rows.push({ x: year === 2025 ? '2025*' : String(year), y: year });
    }
    const el = createContainer({ width: 1100, height: 420 });
    containers.push(el);
    const chart = new VizzyChartEngine(el, lineChart(rows), rows);
    await chart.render();
    const labels = tickLabels(chart.container)
      .filter((tick) => Number.isFinite(yearOf(tick.label)))
      .sort((left, right) => left.x - right.x);
    expect(labels.length).toBeGreaterThan(2);
    expect(yearOf(labels[0]!.label)).toBe(2004);
    expect(labels.at(-1)?.label).toMatch(/^2025/);
    const years = labels.map((tick) => yearOf(tick.label));
    expect(years).toEqual([...years].sort((left, right) => left - right));
  });

  it('still breaks a line where a year is missing', async () => {
    const rows = [1990, 1991, 1994, 1995].map((year) => ({ x: String(year), y: year }));
    const el = createContainer({ width: 800, height: 360 });
    containers.push(el);
    const chart = new VizzyChartEngine(el, lineChart(rows, 800), rows);
    await chart.render();
    const path = chart.container.querySelector('path.line')?.getAttribute('d') ?? '';
    expect(path.match(/M/g)?.length).toBeGreaterThan(1);
  });
});
