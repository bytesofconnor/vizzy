import { VizzyChartEngine } from './engine/VizzyChartEngine';
import { ChartConfig, DataPoint, validateChartConfig, validateDataset } from './types';

function sizedContainer(width: number, height: number): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  document.body.appendChild(el);
  return el;
}

/**
 * Render a validated chart to a standalone SVG string.
 * Requires a DOM (browser, jsdom, or happy-dom).
 */
export async function renderToSVG(config: unknown, data: unknown[]): Promise<string> {
  const validated: ChartConfig = validateChartConfig(config);
  const rows = validateDataset(data);
  const width =
    typeof validated.dimensions.width === 'number' ? validated.dimensions.width : 800;
  const height = validated.dimensions.height;
  const el = sizedContainer(width, height);
  const engine = new VizzyChartEngine(el, validated, rows as DataPoint[]);
  try {
    await engine.render();
    return engine.toSVG();
  } finally {
    engine.destroy();
    el.remove();
  }
}
