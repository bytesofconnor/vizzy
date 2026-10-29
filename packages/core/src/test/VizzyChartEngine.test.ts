import { afterEach, describe, expect, it, vi } from 'vitest';

function readLabel(value: string): string {
  return value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function visibleTickText(root: ParentNode, axis: string): string[] {
  return [...root.querySelectorAll(`${axis} .tick`)]
    .filter((tick) => tick.getAttribute('opacity') !== '0')
    .map((tick) => readLabel(tick.querySelector('text')?.textContent ?? ''));
}
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import { xAxisRoom } from '../layout';
import { validateChartConfig, type ChartConfig } from '../types';
import {
  SAMPLE_REVENUE,
  barConfig,
  createContainer,
  lineConfig,
  scatterConfig,
} from './fixtures';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINNEAPOLIS_NORMALS = [15.6, 20.1, 32.7, 46.9, 59.1, 69.0, 73.8, 71.2, 62.4, 48.7, 34.2, 20.6];

function monthRows(names: string[] = MONTHS): Array<{ month: string; temp: number }> {
  return names.map((month, index) => ({ month, temp: MINNEAPOLIS_NORMALS[index] ?? 40 }));
}

function monthChart(type: 'line' | 'bar', width: number, forecastFrom?: string): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type, showPoints: true, ...(forecastFrom ? { forecastFrom } : {}) },
    dataMapping: { x: 'month', y: 'temp' },
    dimensions: {
      width,
      height: 420,
      margin: { top: 28, right: 32, bottom: 64, left: 64 },
    },
    animation: { enabled: false, duration: 0 },
    axes: {
      x: { show: true, label: 'Month' },
      y: { show: true, label: '°F' },
    },
  });
}

function labelBox(node: Element): { left: number; top: number; right: number; bottom: number } {
  const x = Number(node.getAttribute('x'));
  const y = Number(node.getAttribute('y'));
  const anchor = node.getAttribute('text-anchor') ?? 'start';
  const baseline = node.getAttribute('dominant-baseline') ?? 'auto';
  const text = (node.textContent ?? '').trim();
  const fontSize = 11;
  const advance = fontSize * 0.6;
  const tracking = fontSize * 0.08;
  const width = text.length * advance + Math.max(0, text.length - 1) * tracking;
  const height = fontSize;
  const top = baseline === 'hanging' ? y : y - height * 0.8;
  const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
  return { left, top, right: left + width, bottom: top + height };
}

function samplePath(d: string): Array<{ x: number; y: number }> {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  const read = () => Number(tokens[i++]);
  const push = (x: number, y: number) => {
    cx = x;
    cy = y;
    points.push({ x, y });
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const p0 = { x: cx, y: cy };
    const steps = 12;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const mt = 1 - t;
      push(
        mt ** 3 * p0.x + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x,
        mt ** 3 * p0.y + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y
      );
    }
  };

  while (i < tokens.length) {
    const token = tokens[i]!;
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') {
        push(sx, sy);
      }
      continue;
    }
    if (cmd === 'M') {
      push(read(), read());
      sx = cx;
      sy = cy;
      cmd = 'L';
    } else if (cmd === 'm') {
      push(cx + read(), cy + read());
      sx = cx;
      sy = cy;
      cmd = 'l';
    } else if (cmd === 'L') {
      push(read(), read());
    } else if (cmd === 'l') {
      push(cx + read(), cy + read());
    } else if (cmd === 'H') {
      push(read(), cy);
    } else if (cmd === 'h') {
      push(cx + read(), cy);
    } else if (cmd === 'V') {
      push(cx, read());
    } else if (cmd === 'v') {
      push(cx, cy + read());
    } else if (cmd === 'C') {
      cubic(read(), read(), read(), read(), read(), read());
    } else if (cmd === 'c') {
      cubic(cx + read(), cy + read(), cx + read(), cy + read(), cx + read(), cy + read());
    } else {
      i += 1;
    }
  }
  return points;
}

function segmentsHitBox(
  samples: Array<{ x: number; y: number }>,
  box: { left: number; top: number; right: number; bottom: number },
  pad: number
): boolean {
  const rect = {
    left: box.left - pad,
    top: box.top - pad,
    right: box.right + pad,
    bottom: box.bottom + pad,
  };
  const inside = (point: { x: number; y: number }) =>
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  const cross = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number }
  ) => {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const adx = d.x - a.x;
    const ady = d.y - a.y;
    const cdx = d.x - c.x;
    const cdy = d.y - c.y;
    const cax = a.x - c.x;
    const cay = a.y - c.y;
    const cbx = b.x - c.x;
    const cby = b.y - c.y;
    const abCross = (px: number, py: number) => abx * py - aby * px;
    const cdCross = (px: number, py: number) => cdx * py - cdy * px;
    return abCross(acx, acy) * abCross(adx, ady) < 0 && cdCross(cax, cay) * cdCross(cbx, cby) < 0;
  };
  const edges = [
    [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }],
    [{ x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }],
    [{ x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }],
    [{ x: rect.left, y: rect.bottom }, { x: rect.left, y: rect.top }],
  ];
  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1]!;
    const end = samples[index]!;
    if (inside(start) || inside(end) || edges.some(([c, d]) => cross(start, end, c!, d!))) {
      return true;
    }
  }
  return false;
}

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

  it('dots the line after unpublished months', async () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].map((month, index) => ({ month, revenue: 70 + index }));
    const config = lineConfig();
    const chart = engine({ ...config, chart: { ...config.chart, forecastFrom: 'October' } }, months);
    await chart.render();
    const forecast = chart.container.querySelector('.line-forecast');
    expect(forecast?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(chart.container.querySelector('.forecast-label')?.textContent).toMatch(/forecast/i);
  });

  it('draws climate normals as a solid year with every month labeled', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    try {
      const chart = engine(monthChart('line', 800), monthRows());
      await chart.render();
      expect(chart.container.querySelector('.line-forecast')).toBeNull();
      expect(chart.container.querySelector('.forecast-label')).toBeNull();
      const points = [...chart.container.querySelectorAll('circle.point')];
      expect(points).toHaveLength(12);
      for (const point of points) {
        expect(point.getAttribute('stroke') ?? 'none').toBe('none');
      }
      expect(visibleTickText(chart.container, '.x-axis')).toEqual(MONTH_SHORT);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps all 12 month labels on a narrow axis', async () => {
    const chart = engine(monthChart('line', 390), monthRows());
    await chart.render();
    expect(visibleTickText(chart.container, '.x-axis')).toEqual(MONTH_SHORT);
  });

  it('keeps full month names when a wide axis has room', async () => {
    const chart = engine(monthChart('line', 1400), monthRows());
    await chart.render();
    expect(visibleTickText(chart.container, '.x-axis')).toEqual(MONTHS);
  });

  it('labels every month on a 12-month bar axis', async () => {
    const chart = engine(monthChart('bar', 800), monthRows());
    await chart.render();
    expect(visibleTickText(chart.container, '.x-axis')).toEqual(MONTH_SHORT);
  });

  it('places the forecast label off the stroke', async () => {
    const chart = engine(monthChart('line', 800, 'October'), monthRows());
    await chart.render();
    const forecast = chart.container.querySelector('.line-forecast');
    const label = chart.container.querySelector('.forecast-label');
    const solid = chart.container.querySelector('path.line:not(.line-forecast)');
    expect(forecast?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(label?.textContent).toMatch(/forecast/i);
    const box = labelBox(label!);
    const stroke = [
      ...samplePath(solid?.getAttribute('d') ?? ''),
      ...samplePath(forecast?.getAttribute('d') ?? ''),
    ];
    expect(segmentsHitBox(stroke, box, 4)).toBe(false);
    const clip = chart.container.querySelector('clipPath rect');
    const clipLeft = Number(clip?.getAttribute('x'));
    const clipTop = Number(clip?.getAttribute('y'));
    const clipRight = clipLeft + Number(clip?.getAttribute('width'));
    const clipBottom = clipTop + Number(clip?.getAttribute('height'));
    expect(box.left).toBeGreaterThanOrEqual(clipLeft - 1);
    expect(box.top).toBeGreaterThanOrEqual(clipTop - 1);
    expect(box.right).toBeLessThanOrEqual(clipRight + 1);
    expect(box.bottom).toBeLessThanOrEqual(clipBottom + 1);
  });

  it('keeps every named category labeled', async () => {
    const tools = [
      'Replit (Rank)',
      'Windsurf (Rank)',
      'Claude (Rank)',
      'Copilot (SO%)',
      'Cursor (SO%)',
      'Replit (SO%)',
      'Windsurf (JB%)',
      'Claude (JB%)',
      'Copilot (JB%)',
      'Cursor (JB%)',
      'Gemini (Rank)',
      'Aider (Rank)',
    ].map((month, index) => ({ month, revenue: 10 + index * 3 }));
    const chart = engine(barConfig(), tools);
    await chart.render();
    const visible = [...chart.container.querySelectorAll('.x-axis .tick')].filter(
      (tick) => tick.getAttribute('opacity') !== '0'
    );
    expect(visible).toHaveLength(tools.length);
    expect(visible.some((tick) => (tick.textContent ?? '').includes('Claude'))).toBe(true);
  });

  it('labels a long people series by last name', async () => {
    const scorers = [
      'Alan Shearer',
      'Harry Kane',
      'Wayne Rooney',
      'Andy Cole',
      'Sergio Agüero',
      'Frank Lampard',
      'Thierry Henry',
      'Robbie Fowler',
      'Jermain Defoe',
      'Mohamed Salah',
      'Michael Owen',
      'Les Ferdinand',
      'Teddy Sheringham',
      'Robin van Persie',
      'Jamie Vardy',
    ].map((month, index) => ({ month, revenue: 260 - index * 8 }));
    const chart = engine(barConfig(), scorers);
    await chart.render();
    const labels = [...chart.container.querySelectorAll('.x-axis .tick text')].filter(
      (tick) => tick.parentElement?.getAttribute('opacity') !== '0'
    );
    expect(labels).toHaveLength(scorers.length);
    expect(labels.some((tick) => (tick.textContent ?? '').includes('Shearer'))).toBe(true);
    expect(labels.some((tick) => (tick.textContent ?? '').includes('Alan'))).toBe(false);
  });

  it('keeps the x-axis title below rotated category names', async () => {
    const tools = [
      'Claude Code',
      'GitHub Copilot',
      'OpenAI Codex',
      'Cursor',
      'JetBrains AI/Junie',
      'OpenCode',
      'Google Antigravity',
    ].map((month, index) => ({ month, revenue: 40 - index * 4 }));
    const config = {
      ...barConfig(),
      dimensions: { ...barConfig().dimensions, width: 520, height: 400 },
    };
    config.axes.x.label = 'Coding Agent';
    const chart = engine(config, tools);
    await chart.render();
    const title = chart.container.querySelector('.x-axis .axis-label');
    const rotated = [...chart.container.querySelectorAll('.x-axis .tick text')].some((node) =>
      (node.getAttribute('transform') ?? '').includes('rotate')
    );
    expect(rotated).toBe(true);
    expect(title?.textContent).toMatch(/Coding/);
    expect(Number(title?.getAttribute('y'))).toBeGreaterThan(100);
  });

  it('grows the svg so long x labels stay inside the viewBox', async () => {
    const rows = [
      { month: '(1979-2025) NOAA', revenue: 76 },
      { month: '(1979-2025) NSIDC', revenue: 77 },
      { month: '(since 1979) EEA', revenue: 71 },
      { month: '(since 1979) NIPR', revenue: 84 },
    ];
    const config = {
      ...barConfig(),
      dimensions: { ...barConfig().dimensions, width: 480, height: 240 },
    };
    config.axes.x.label = 'Source';
    const chart = engine(config, rows);
    await chart.render();
    const svg = chart.container.querySelector('svg');
    const height = Number(svg?.getAttribute('height'));
    const room = xAxisRoom(
      rows.map((row) => row.month),
      { hasTitle: true, innerWidth: 480 - 40 - 20 }
    );
    expect(height).toBeGreaterThanOrEqual(132 + room.bottom);
  });

  it('thins overlapping x labels and keeps the ends', async () => {
    const seasons = Array.from({ length: 25 }, (_, index) => ({
      month: `${2000 + index}-${String((index + 1) % 100).padStart(2, '0')}`,
      revenue: 30 + index,
    }));
    const chart = engine(barConfig(), seasons);
    await chart.render();
    const ticks = [...chart.container.querySelectorAll('.x-axis .tick')];
    const visible = ticks.filter((tick) => tick.getAttribute('opacity') !== '0');
    expect(visible.length).toBeGreaterThan(1);
    expect(visible.length).toBeLessThan(seasons.length);
    expect(visible[0]?.textContent).toContain('2000');
    expect(visible.at(-1)?.textContent).toContain('2024');
  });

  it('keeps the area fill on the plot floor', async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr'].map((month, index) => ({
      month,
      revenue: 64 + index,
    }));
    const config = lineConfig();
    const chart = engine({ ...config, chart: { ...config.chart, area: true } }, months);
    await chart.render();
    const area = chart.container.querySelector('path.area');
    const ys = [...(area?.getAttribute('d') ?? '').matchAll(/-?\d*\.?\d+,(-?\d*\.?\d+)/g)].map((match) => Number(match[1]));
    expect(ys.length).toBeGreaterThan(0);
    expect(Math.max(...ys)).toBeLessThan(400);
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

  it('sits category labels on bar centers and skips year callouts', async () => {
    const cities = [
      { month: 'Wabasha', revenue: 1830 },
      { month: 'St. Paul', revenue: 1849 },
      { month: 'Stillwater', revenue: 1854 },
      { month: 'Brooklyn Park', revenue: 1858 },
      { month: 'Minneapolis', revenue: 1867 },
    ];
    const chart = engine(barConfig(), cities);
    await chart.render();
    const svg = chart.container.querySelector('svg');
    expect(svg?.querySelector('.bar-label')).toBeNull();

    const bars = [...chart.container.querySelectorAll('rect.bar')];
    const ticks = [...chart.container.querySelectorAll('.x-axis .tick')];
    expect(bars).toHaveLength(ticks.length);

    for (let i = 0; i < bars.length; i += 1) {
      const bar = bars[i]!;
      const center = Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) / 2;
      const tickX = Number(/translate\(([-0-9.]+)/.exec(ticks[i]!.getAttribute('transform') ?? '')?.[1]);
      expect(Math.abs(center - tickX)).toBeLessThan(1.5);
      expect(ticks[i]!.querySelector('text')?.getAttribute('text-anchor')).toBe('middle');
      expect(ticks[i]!.querySelector('text')?.getAttribute('transform')).toBeFalsy();
    }

    const heights = bars.map((bar) => Number(bar.getAttribute('height')));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(20);
  });

  it('wraps long names under the bar and never paints a value callout', async () => {
    const breweries = [
      { month: 'August Schell Brewing Company', revenue: 108000 },
      { month: 'Summit Brewing Company', revenue: 76000 },
      { month: 'Surly Brewing Company', revenue: 52000 },
    ];
    const tight = {
      ...barConfig(),
      dimensions: { ...barConfig().dimensions, width: 420 },
    };
    const chart = engine(tight, breweries);
    await chart.render();
    expect(chart.container.querySelector('.bar-label')).toBeNull();

    const first = chart.container.querySelector('.x-axis .tick text');
    const lines = [...(first?.querySelectorAll('tspan') ?? [])].map((node) => node.textContent);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toContain('August');
    expect(first?.getAttribute('transform')).toBeFalsy();
  });

  it('does not park a rotated-label well under wrapped category names', async () => {
    const rows = [
      { month: 'White rhino', revenue: 15700 },
      { month: 'Black rhino', revenue: 6400 },
      { month: 'Greater one-horned rhino', revenue: 4000 },
      { month: 'Javan rhino', revenue: 70 },
      { month: 'Sumatran rhino', revenue: 40 },
    ];
    const config = barConfig();
    config.axes.x.label = 'Species';
    const chart = engine(config, rows);
    await chart.render();
    const title = chart.container.querySelector('.x-axis .axis-label');
    expect(Number(title?.getAttribute('y'))).toBeLessThan(90);
    const phone = xAxisRoom(rows.map((row) => row.month), { hasTitle: true, innerWidth: 280 });
    expect(phone.bottom).toBeGreaterThan(Number(title?.getAttribute('y') ?? 0) + 40);
  });

  it('shows a chart tip when the pointer is over a bar', async () => {
    const config = barConfig();
    config.chart = { ...config.chart, showValues: true };
    config.interaction = { ...config.interaction, hover: true, tooltip: true };
    const chart = engine(config);
    await chart.render();
    const bar = chart.container.querySelector('rect.bar');
    expect(bar).toBeTruthy();
    bar?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 40, clientY: 40, bubbles: true }));
    const tip = chart.container.querySelector('.vizzy-tip');
    expect(tip?.textContent).toMatch(/Jan/);
    expect((tip as HTMLDivElement | null)?.hidden).toBe(false);
  });

  it('keeps place names whole on a crowded bar chart', async () => {
    const places = [
      'United States',
      'United Kingdom',
      'Burkina Faso',
      'New Jersey',
      'San Marino',
      'China',
      'India',
      'Russia',
      'Japan',
      'France',
      'Germany',
      'Brazil',
    ];
    const rows = places.map((month, index) => ({ month, revenue: 80 - index * 5 }));
    const el = createContainer({ width: 360, height: 420 });
    containers.push(el);
    const config = barConfig();
    config.dimensions = { ...config.dimensions, width: 360, height: 420 };
    config.axes.x.label = 'Country';
    const chart = new VizzyChartEngine(el, config, rows);
    await chart.render();
    const labels = visibleTickText(el, '.x-axis');
    expect(labels).toEqual(expect.arrayContaining([
      'United States',
      'United Kingdom',
      'Burkina Faso',
      'New Jersey',
      'San Marino',
    ]));
    expect(labels).not.toContain('States');
    expect(labels).not.toContain('Faso');
    expect(labels).not.toContain('Jersey');
    expect(labels).not.toContain('Marino');
    chart.destroy();
  });

  it('keeps spaces in category labels', async () => {
    const rows = [
      { month: 'Q2 2020', revenue: 12 },
      { month: 'Jan 2025', revenue: 14 },
      { month: 'Sweater Weather', revenue: 9 },
    ];
    const chart = engine(barConfig(), rows);
    await chart.render();
    const labels = visibleTickText(chart.container, '.x-axis').map(readLabel);
    expect(labels).toEqual(['Q2 2020', 'Jan 2025', 'Sweater Weather']);
  });

  it('labels fed funds months and arctic years in full', async () => {
    const funds = [];
    for (let year = 2000; year <= 2002; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        funds.push({ month: `${year}-${String(month).padStart(2, '0')}`, revenue: 1 + month / 12 });
      }
    }
    const fundChart = engine(lineConfig(), funds);
    await fundChart.render();
    const fundLabels = visibleTickText(fundChart.container, '.x-axis').map(readLabel);
    expect(fundLabels.some((label) => label === '00/01' || label === '20/01')).toBe(false);
    expect(fundLabels.some((label) => label.includes('2000'))).toBe(true);
    expect(new Set(fundLabels.map((label) => (label.match(/\d{4}/) ? 'year' : 'other'))).size).toBeGreaterThan(0);

    const ice = [];
    for (let year = 1979; year <= 2023; year += 1) {
      ice.push({ month: String(year), revenue: 7 - (year - 1979) * 0.04 });
    }
    const el = createContainer({ width: 720, height: 360 });
    containers.push(el);
    const iceConfig = lineConfig();
    iceConfig.dimensions = { ...iceConfig.dimensions, width: 720 };
    const iceChart = new VizzyChartEngine(el, iceConfig, ice);
    await iceChart.render();
    const years = visibleTickText(el, '.x-axis').map(readLabel);
    expect(years.every((label) => /^\d{4}$/.test(label))).toBe(true);
    expect(years).toContain('1979');
    expect(years).toContain('2023');
    expect(years.some((label) => label.length < 4)).toBe(false);
    iceChart.destroy();
  });

  it('does not label a bitcoin price as 35.0408k', async () => {
    const config = barConfig();
    config.chart = { ...config.chart, showValues: true };
    const rows = [
      { month: 'May', revenue: 35040.8 },
      { month: 'Jun', revenue: 42000 },
    ];
    const chart = engine(config, rows);
    await chart.render();
    const painted = [...chart.container.querySelectorAll('text')].map((node) => readLabel(node.textContent ?? ''));
    expect(painted.some((label) => label.includes('35.0408k'))).toBe(false);
    expect(painted.some((label) => label.includes('35,041'))).toBe(true);
  });

  it('labels every state when the set does not fit under the bars', async () => {
    const states = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
      'Wisconsin', 'Wyoming',
    ];
    const rows = states.map((month, index) => ({ month, revenue: 1000 - index }));
    const el = createContainer({ width: 360, height: 480 });
    containers.push(el);
    const config = barConfig();
    config.dimensions = { ...config.dimensions, width: 360, height: 480 };
    config.axes.y.label = 'State';
    const chart = new VizzyChartEngine(el, config, rows);
    await chart.render();
    expect(el.querySelectorAll('rect.bar')).toHaveLength(states.length);
    const labels = visibleTickText(el, '.y-axis').map(readLabel);
    expect(labels).toHaveLength(states.length);
    expect(labels).toContain('New Jersey');
    expect(labels).toContain('North Carolina');
    expect(labels).not.toContain('Jersey');
    expect(labels).not.toContain('Carolina');
    chart.destroy();
  });

  it('does not stretch the plot to match a tall container', async () => {
    const el = createContainer({ width: 360, height: 2400 });
    containers.push(el);
    const chart = new VizzyChartEngine(el, barConfig(), SAMPLE_REVENUE);
    await chart.render();
    const height = Number(chart.container.querySelector('svg')?.getAttribute('height'));
    expect(height).toBeGreaterThan(180);
    expect(height).toBeLessThan(420);
  });
});
