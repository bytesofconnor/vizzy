import { describe, expect, it } from 'vitest';
import { heuristicRevisionPrompts } from './revision-heuristics';
import type { ChartSeed } from './seed';

const barSeed: ChartSeed = {
  title: 'Wild Tiger Population by Country',
  kicker: 'Wildlife',
  note: '',
  chartType: 'bar',
  area: false,
  xLabel: 'Country',
  yLabel: 'Wild Tigers',
  sourceLabel: 'Example',
  sourceMethod: 'example',
  evidence: '',
  rows: [
    { x: 'India', y: 3682 },
    { x: 'Russia', y: 433 },
    { x: 'Nepal', y: 355 },
    { x: 'Indonesia', y: 148 },
    { x: 'Thailand', y: 148 },
    { x: 'Malaysia', y: 120 },
  ],
};

describe('heuristicRevisionPrompts', () => {
  it('suggests sort and chart-type changes for a bar chart', () => {
    const prompts = heuristicRevisionPrompts(barSeed);
    expect(prompts.some((line) => /sort by/i.test(line))).toBe(true);
    expect(prompts.some((line) => /line/i.test(line))).toBe(true);
    expect(prompts.length).toBeGreaterThanOrEqual(3);
  });

  it('suggests breaking out sparse charts', () => {
    const sparse: ChartSeed = {
      ...barSeed,
      rows: [{ x: 'Taiwan', y: 68 }],
    };
    const prompts = heuristicRevisionPrompts(sparse);
    expect(prompts.some((line) => /more (categories|rows)/i.test(line))).toBe(true);
  });

  it('dedupes prompts', () => {
    const prompts = heuristicRevisionPrompts(barSeed);
    const lower = prompts.map((line) => line.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('offers print grayscale when the chart is still in color', () => {
    const prompts = heuristicRevisionPrompts(barSeed);
    expect(prompts.some((line) => /grayscale for print/i.test(line))).toBe(true);
  });

  it('skips print grayscale when already applied', () => {
    const prompts = heuristicRevisionPrompts({ ...barSeed, printGrayscale: true });
    expect(prompts.some((line) => /grayscale for print/i.test(line))).toBe(false);
  });
});
