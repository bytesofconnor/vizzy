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

  it('keeps a phone-width GDP axis off the 2020 to 2023 jump', async () => {
    const years = Array.from({ length: 24 }, (_, index) => 2000 + index);
    const labels = await renderYears(years, 360);
    assertEvenNiceStep(labels);
    const jump = labels.findIndex((year, index) => year === 2023 && labels[index - 1] === 2020);
    expect(jump).toBe(-1);
  });

  it('keeps a phone-width Antarctic axis off the 2001 to 2004 jump', async () => {
    const years = Array.from({ length: 48 }, (_, index) => 1979 + index);
    const labels = await renderYears(years, 360);
    assertEvenNiceStep(labels);
    const jump = labels.findIndex((year, index) => year === 2004 && labels[index - 1] === 2001);
    expect(jump).toBe(-1);
  });

  it('spaces month labels on one step through the last tick', async () => {
    const stamps: string[] = [];
    for (let year = 2006; year <= 2025; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        stamps.push(`${year}-${String(month).padStart(2, '0')}`);
      }
    }
    const rows = stamps.map((month, index) => ({ month, revenue: 1000 + index }));
    const el = createContainer({ width: 720, height: 360 });
    const config = lineConfig();
    config.dimensions = { ...config.dimensions, width: 720, height: 360 };
    const chart = new VizzyChartEngine(el, config, rows);
    await chart.render();
    const labels = [...el.querySelectorAll('.x-axis .tick')]
      .filter((tick) => tick.getAttribute('opacity') !== '0')
      .map((tick) => readLabel(tick.querySelector('text')?.textContent ?? ''));
    chart.destroy();
    const keys = labels.map(monthKey);
    expect(keys.every((key) => key !== null)).toBe(true);
    const gaps = keys.slice(1).map((key, index) => (key ?? 0) - (keys[index] ?? 0));
    expect(new Set(gaps).size).toBe(1);
    expect(gaps[0]).toBeGreaterThan(0);
  });
});

function monthKey(label: string): number | null {
  const named = label.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*((?:19|20)\d{2})$/);
  if (!named) {
    return null;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Number(named[2]) * 12 + months.indexOf(named[1]!) + 1;
}
