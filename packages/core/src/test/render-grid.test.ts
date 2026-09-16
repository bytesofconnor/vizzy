import { describe, expect, it } from 'vitest';
import { VizzyChartEngine } from '../engine/VizzyChartEngine';
import { createContainer, lineConfig, barConfig, SAMPLE_REVENUE } from './fixtures';

describe('renderGrid', () => {
  it('draws dashed y grid lines above the background fill', async () => {
    const container = createContainer();
    const config = {
      ...lineConfig(),
      colors: {
        ...lineConfig().colors,
        background: '#ebe9e3',
        grid: '#c5c2b9',
      },
      axes: {
        x: { show: true, grid: false },
        y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 5 },
      },
    };
    const engine = new VizzyChartEngine(container, config, SAMPLE_REVENUE);
    await engine.render();
    const svg = engine.toSVG();

    expect(svg).toContain('class="grid-group"');
    expect(svg).toContain('class="y-grid"');
    expect(svg).toMatch(/stroke-dasharray="2 5"/);
    expect(svg).toMatch(/stroke-opacity="0\.55"/);

    const bgIndex = svg.indexOf('class="vizzy-bg"');
    const gridIndex = svg.indexOf('class="grid-group"');
    expect(bgIndex).toBeGreaterThan(-1);
    expect(gridIndex).toBeGreaterThan(bgIndex);

    engine.destroy();
    container.remove();
  });

  it('draws y grid lines for bar charts', async () => {
    const container = createContainer();
    const config = {
      ...barConfig(),
      axes: {
        x: { show: true, grid: false },
        y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 4 },
      },
    };
    const engine = new VizzyChartEngine(container, config, SAMPLE_REVENUE);
    await engine.render();
    const svg = engine.toSVG();

    expect(svg).toContain('class="y-grid"');
    expect(svg.match(/class="y-grid"[\s\S]*?<line/g)?.length ?? 0).toBeGreaterThan(0);

    engine.destroy();
    container.remove();
  });
});
