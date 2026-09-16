import { describe, expect, it } from 'vitest';
import { linePointLabelPlacement } from '../format';

describe('linePointLabelPlacement', () => {
  const plotTop = 0;
  const plotBottom = 300;

  it('places labels below a steep descending segment', () => {
    const placement = linePointLabelPlacement({
      x: 400,
      y: 220,
      prevY: 120,
      plotTop,
      plotBottom,
    });

    expect(placement.dominantBaseline).toBe('hanging');
    expect(placement.y).toBeGreaterThan(220);
    expect(placement.textAnchor).toBe('start');
    expect(placement.x).toBeGreaterThan(400);
  });

  it('places labels above an ascending segment near the top', () => {
    const placement = linePointLabelPlacement({
      x: 400,
      y: 40,
      prevY: 90,
      plotTop,
      plotBottom,
    });

    expect(placement.y).toBeLessThan(40);
  });

  it('stacks labels when multiple series share an x position', () => {
    const first = linePointLabelPlacement({
      x: 400,
      y: 180,
      prevY: 160,
      plotTop,
      plotBottom,
      seriesIndex: 0,
      seriesCount: 3,
    });
    const last = linePointLabelPlacement({
      x: 400,
      y: 180,
      prevY: 160,
      plotTop,
      plotBottom,
      seriesIndex: 2,
      seriesCount: 3,
    });

    expect(last.y).toBeGreaterThan(first.y);
  });
});
