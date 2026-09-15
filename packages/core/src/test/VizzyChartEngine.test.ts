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
});
