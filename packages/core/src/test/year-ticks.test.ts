import { describe, expect, it } from 'vitest';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import { createContainer, lineConfig } from './fixtures';

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

function readLabel(value: string): string {
  return value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function visibleYears(root: ParentNode): number[] {
  return [...root.querySelectorAll('.x-axis .tick')]
    .filter((tick) => tick.getAttribute('opacity') !== '0')
    .map((tick) => Number(readLabel(tick.querySelector('text')?.textContent ?? '')));
}

async function renderYears(years: number[], width: number): Promise<number[]> {
  const rows = years.map((year) => ({ month: String(year), revenue: 10 + (year % 7) }));
  const el = createContainer({ width, height: 360 });
  const config = lineConfig();
  config.dimensions = { ...config.dimensions, width, height: 360 };
  const chart = new VizzyChartEngine(el, config, rows);
  await chart.render();
  const labels = visibleYears(el);
  chart.destroy();
  return labels;
}

function assertEvenNiceStep(labels: number[]): void {
  expect(labels.length).toBeGreaterThan(1);
  expect(labels.every((year) => Number.isInteger(year) && year >= 1000)).toBe(true);
  const gaps = labels.slice(1).map((year, index) => year - labels[index]!);
  expect(new Set(gaps).size).toBe(1);
  expect(NICE_STEPS).toContain(gaps[0]);
}

describe('year ticks', () => {
  it('spaces US GDP years on one nice step and does not force the last year', async () => {
    const years = Array.from({ length: 24 }, (_, index) => 2000 + index);
    const labels = await renderYears(years, 800);
    assertEvenNiceStep(labels);
    const step = labels[1]! - labels[0]!;
    const last = labels.at(-1)!;
    if (last !== 2023) {
      expect((2023 - last) % step).not.toBe(0);
    }
  });

  it('spaces Antarctic years from 1979 through 2026 on one nice step', async () => {
    const years = Array.from({ length: 48 }, (_, index) => 1979 + index);
    const labels = await renderYears(years, 1040);
    assertEvenNiceStep(labels);
    const jump = labels.findIndex((year, index) => year === 2004 && labels[index - 1] === 2001);
    expect(jump).toBe(-1);
  });
});
