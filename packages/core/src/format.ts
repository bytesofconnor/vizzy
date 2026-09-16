import * as d3 from 'd3';

/** Compact numeric label for axis ticks and bar callouts. */
export function formatDataValue(n: number, domain: [number, number]): string {
  if (!Number.isFinite(n)) {
    return '';
  }
  const yearAxis = domain[0] >= 1000 && domain[1] <= 2100 && domain[1] - domain[0] < 800;
  if (yearAxis) {
    return String(Math.round(n));
  }
  if (Math.abs(n) >= 10_000) {
    return d3.format('~s')(n).replace('G', 'B');
  }
  if (Math.abs(n) >= 1000) {
    return d3.format(',')(n);
  }
  return Number.isInteger(n) ? String(n) : d3.format('.1f')(n);
}

export interface LinePointLabelPlacement {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'auto' | 'hanging';
}

/** Place a line-chart value label so it does not sit on the incoming segment. */
export function linePointLabelPlacement(args: {
  x: number;
  y: number;
  prevY: number | null;
  plotTop: number;
  plotBottom: number;
  seriesIndex?: number;
  seriesCount?: number;
}): LinePointLabelPlacement {
  const {
    x,
    y,
    prevY,
    plotTop,
    plotBottom,
    seriesIndex = 0,
    seriesCount = 1,
  } = args;

  const descending = prevY !== null && y > prevY + 2;
  const ascending = prevY !== null && y < prevY - 2;
  const steep = prevY !== null && Math.abs(y - prevY) > 22;
  const nearTop = y < plotTop + 16;
  const nearBottom = y > plotBottom - 16;

  let textAnchor: LinePointLabelPlacement['textAnchor'] = 'middle';
  let dominantBaseline: LinePointLabelPlacement['dominantBaseline'] = 'auto';
  let labelX = x;
  let labelY = y;

  if (steep && descending) {
    textAnchor = 'start';
    labelX = x + 8;
    labelY = y + 5;
    dominantBaseline = 'hanging';
  } else if (descending || nearBottom) {
    labelY = y + 14;
    dominantBaseline = 'hanging';
  } else if (ascending || nearTop) {
    labelY = y - 10;
  } else {
    labelY = y > (plotTop + plotBottom) / 2 ? y - 10 : y + 14;
    dominantBaseline = labelY > y ? 'hanging' : 'auto';
  }

  if (seriesCount > 1) {
    const stack = (seriesIndex - (seriesCount - 1) / 2) * 11;
    labelY += stack;
  }

  return { x: labelX, y: labelY, textAnchor, dominantBaseline };
}
