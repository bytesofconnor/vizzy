import { afterEach, describe, expect, it } from 'vitest';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import type { ChartConfig } from '../types';
import { validateChartConfig } from '../types';
import { createContainer } from './fixtures';

const PRICES = [
  { year: '2021', price: 10 },
  { year: '2022', price: 12 },
  { year: '2023', price: 11 },
  { year: '2024', price: 80 },
  { year: '2025', price: 13 },
  { year: '2026', price: 12 },
];

type Curve = 'linear' | 'monotone' | 'cardinal' | 'basis' | 'step';

function lineConfig(curve?: Curve): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: {
      type: 'line',
      showPoints: true,
      ...(curve ? { curve } : {}),
    },
    dataMapping: { x: 'year', y: 'price' },
    dimensions: { width: 800, height: 400 },
    animation: { enabled: false, duration: 0 },
  });
}

function tokensOf(path: string): string[] {
  return path.match(/[MLC]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
}

function segmentDistance(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = dx * dx + dy * dy;
  if (length === 0) {
    return Math.hypot(px - x0, py - y0);
  }
  const t = Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / length));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function strokeNear(path: string, px: number, py: number): boolean {
  const tokens = tokensOf(path);
  let index = 0;
  let x = 0;
  let y = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    if (command === 'M') {
      x = Number(tokens[index + 1]);
      y = Number(tokens[index + 2]);
      if (Math.hypot(px - x, py - y) <= 1.5) {
        return true;
      }
      index += 3;
      continue;
    }
    if (command === 'L') {
      const x1 = Number(tokens[index + 1]);
      const y1 = Number(tokens[index + 2]);
      if (segmentDistance(px, py, x, y, x1, y1) <= 1.5) {
        return true;
      }
      x = x1;
      y = y1;
      index += 3;
      continue;
    }
    if (command === 'C') {
      const x1 = Number(tokens[index + 1]);
      const y1 = Number(tokens[index + 2]);
      const x2 = Number(tokens[index + 3]);
      const y2 = Number(tokens[index + 4]);
      const x3 = Number(tokens[index + 5]);
      const y3 = Number(tokens[index + 6]);
      for (let step = 0; step <= 20; step += 1) {
        const t = step / 20;
        const rest = 1 - t;
        const sx = rest ** 3 * x + 3 * rest ** 2 * t * x1 + 3 * rest * t ** 2 * x2 + t ** 3 * x3;
        const sy = rest ** 3 * y + 3 * rest ** 2 * t * y1 + 3 * rest * t ** 2 * y2 + t ** 3 * y3;
        if (Math.hypot(px - sx, py - sy) <= 1.5) {
          return true;
        }
      }
      x = x3;
      y = y3;
      index += 7;
      continue;
    }
    index += 1;
  }
  return false;
}

function sampledYs(path: string): number[] {
  const tokens = tokensOf(path);
  const ys: number[] = [];
  let index = 0;
  let y = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    if (command === 'M' || command === 'L') {
      y = Number(tokens[index + 2]);
      ys.push(y);
      index += 3;
      continue;
    }
    if (command === 'C') {
      const y1 = Number(tokens[index + 2]);
      const y2 = Number(tokens[index + 4]);
      const y3 = Number(tokens[index + 6]);
      for (const t of [0.25, 0.5, 0.75]) {
        const rest = 1 - t;
        ys.push(rest ** 3 * y + 3 * rest ** 2 * t * y1 + 3 * rest * t ** 2 * y2 + t ** 3 * y3);
      }
      y = y3;
      ys.push(y);
      index += 7;
      continue;
    }
    index += 1;
  }
  return ys;
}

describe('honest line', () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const el of containers) {
      el.remove();
    }
    containers.length = 0;
  });

  it.each([
    ['default', undefined],
    ['linear', 'linear'],
    ['monotone', 'monotone'],
    ['cardinal', 'cardinal'],
    ['basis', 'basis'],
    ['step', 'step'],
  ] as const)('keeps a %s line on the points and inside their range', async (_label, curve) => {
    const el = createContainer();
    containers.push(el);
    const chart = new VizzyChartEngine(el, lineConfig(curve), PRICES);
    await chart.render();
    const path = chart.container.querySelector('path.line')?.getAttribute('d') ?? '';
    const circles = [...chart.container.querySelectorAll('circle.point')];
    expect(path.length).toBeGreaterThan(0);
    expect(circles).toHaveLength(PRICES.length);

    for (const circle of circles) {
      const cx = Number(circle.getAttribute('cx'));
      const cy = Number(circle.getAttribute('cy'));
      expect(strokeNear(path, cx, cy)).toBe(true);
    }

    const top = Math.min(...circles.map((circle) => Number(circle.getAttribute('cy'))));
    const bottom = Math.max(...circles.map((circle) => Number(circle.getAttribute('cy'))));
    for (const y of sampledYs(path)) {
      expect(y).toBeGreaterThanOrEqual(top - 1);
      expect(y).toBeLessThanOrEqual(bottom + 1);
    }
  });
});
