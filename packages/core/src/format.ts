import * as d3 from 'd3';

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

export function plainScripts(value: string): string {
  let out = '';
  for (const ch of value) {
    const sub = SUBSCRIPT_DIGITS.indexOf(ch);
    if (sub >= 0) {
      out += String(sub);
      continue;
    }
    const sup = SUPERSCRIPT_DIGITS.indexOf(ch);
    if (sup >= 0) {
      out += String(sup);
      continue;
    }
    out += ch;
  }
  return out;
}

const SCALE_WORDS: Array<[RegExp, number]> = [
  [/\btrillions?\b/i, 1e12],
  [/\bbillions?\b/i, 1e9],
  [/\bmillions?\b/i, 1e6],
  [/\bthousands?\b/i, 1e3],
];

export type UnitScale = { factor: number; money: boolean };

/** The axis title's named scale. "$ millions" multiplies the stored number by 1e6. */
export function unitScale(label: string | undefined): UnitScale {
  if (!label) {
    return { factor: 1, money: false };
  }
  let factor = 1;
  for (const [pattern, value] of SCALE_WORDS) {
    if (pattern.test(label)) {
      factor = value;
      break;
    }
  }
  return { factor, money: /\$|usd|dollar/i.test(label) };
}

/** Drop a scale the tick labels already include, so the title does not count it twice. */
export function axisLabelWithoutScale(label: string): string {
  if (unitScale(label).factor === 1) {
    return label;
  }
  const stripped = label
    .replace(
      /\s*\(\s*\$?\s*(?:thousands?|millions?|billions?|trillions?)(?:\s*,\s*([^)]*))?\s*\)/i,
      (_match, rest: string | undefined) => (rest ? ` (${rest.trim()})` : '')
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped || label;
}

function printedMagnitude(shown: number): number {
  const abs = Math.abs(shown);
  if (abs >= 1e12) {
    return 1e12;
  }
  if (abs >= 1e9) {
    return 1e9;
  }
  if (abs >= 1e6) {
    return 1e6;
  }
  if (abs >= 1e3) {
    return 1e3;
  }
  return 1;
}

/** Drop a stored scale word once the drawn ticks use a different magnitude. */
export function noteWithoutStoredScale(note: string, labels: string[], samples: number[]): string {
  const finite = samples.filter((value) => Number.isFinite(value)).map((value) => Math.abs(value));
  if (!note.trim() || finite.length === 0) {
    return note;
  }
  const peak = Math.max(...finite);
  let next = note;
  for (const label of labels) {
    const unit = unitScale(label);
    if (unit.factor === 1) {
      continue;
    }
    if (printedMagnitude(peak * unit.factor) === unit.factor) {
      continue;
    }
    next = next
      .replace(/\s*\(\s*\$?\s*(?:thousands?|millions?|billions?|trillions?)(?:\s*,\s*[^)]*)?\s*\)/gi, '')
      .replace(/\$\s*(?:thousands?|millions?|billions?|trillions?)\b/gi, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .trim();
  }
  return next;
}

function formatMagnitude(n: number, domain: [number, number]): string {
  const yearAxis = domain[0] >= 1000 && domain[1] <= 2100 && domain[1] - domain[0] < 800;
  if (yearAxis) {
    return String(Math.round(n));
  }
  const chartMax = Math.max(Math.abs(domain[0]), Math.abs(domain[1]));
  if (chartMax >= 1_000_000) {
    return d3.format('.3~s')(n).replace('G', 'B');
  }
  if (chartMax >= 1000) {
    return d3.format(',.0f')(n);
  }
  return Number.isInteger(n) ? String(n) : d3.format('.1f')(n);
}

export function formatDataValue(n: number, domain: [number, number], unitLabel?: string): string {
  if (!Number.isFinite(n)) {
    return '';
  }
  const unit = unitScale(unitLabel);
  const shown = n * unit.factor;
  const shownDomain: [number, number] = [domain[0] * unit.factor, domain[1] * unit.factor];
  const body = formatMagnitude(shown, shownDomain);
  if (!unit.money || unit.factor === 1) {
    return body;
  }
  return body.startsWith('-') ? `-$${body.slice(1)}` : `$${body}`;
}

export function yTickLabels(
  domain: [number, number],
  unitLabel: string | undefined,
  tickCount = 10
): string[] {
  const scale = d3.scaleLinear().domain(domain).nice();
  const shown = scale.domain() as [number, number];
  return scale.ticks(tickCount).map((tick) => formatDataValue(tick, shown, unitLabel));
}

type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

const FORECAST_FONT = 11;

function forecastWordBox(anchor: LinePointLabelPlacement): Box {
  const advance = FORECAST_FONT * 0.64;
  const tracking = FORECAST_FONT * 0.08;
  const width = 'Forecast'.length * advance + 7 * tracking;
  const height = FORECAST_FONT;
  const top = anchor.dominantBaseline === 'hanging' ? anchor.y : anchor.y - height * 0.8;
  const left = anchor.textAnchor === 'end'
    ? anchor.x - width
    : anchor.textAnchor === 'middle'
      ? anchor.x - width / 2
      : anchor.x;
  return { left, top, right: left + width, bottom: top + height };
}

function sampleSvgPath(d: string): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points: Point[] = [];
  let index = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  const read = () => Number(tokens[index++]);
  const push = (x: number, y: number) => {
    cx = x;
    cy = y;
    points.push({ x, y });
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const start = { x: cx, y: cy };
    const steps = 12;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const mt = 1 - t;
      push(
        mt ** 3 * start.x + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x,
        mt ** 3 * start.y + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y
      );
    }
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (!token) {
      break;
    }
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      index += 1;
      continue;
    }
    if (cmd === 'M' || cmd === 'L') {
      push(read(), read());
      if (cmd === 'M') {
        cmd = 'L';
      }
    } else if (cmd === 'H') {
      push(read(), cy);
    } else if (cmd === 'V') {
      push(cx, read());
    } else if (cmd === 'C') {
      cubic(read(), read(), read(), read(), read(), read());
    } else {
      index += 1;
    }
  }
  return points;
}

function boxHoldsSegment(box: Box, start: Point, end: Point): boolean {
  const inside = (point: Point) =>
    point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
  if (inside(start) || inside(end)) {
    return true;
  }
  const edges: Array<[Point, Point]> = [
    [{ x: box.left, y: box.top }, { x: box.right, y: box.top }],
    [{ x: box.right, y: box.top }, { x: box.right, y: box.bottom }],
    [{ x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }],
    [{ x: box.left, y: box.bottom }, { x: box.left, y: box.top }],
  ];
  const crosses = (a: Point, b: Point, c: Point, d: Point) => {
    const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
  };
  return edges.some(([c, d]) => crosses(start, end, c, d));
}

function labelHitsStroke(box: Box, samples: Point[], pad: number): boolean {
  const padded = {
    left: box.left - pad,
    top: box.top - pad,
    right: box.right + pad,
    bottom: box.bottom + pad,
  };
  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1];
    const end = samples[index];
    if (start && end && boxHoldsSegment(padded, start, end)) {
      return true;
    }
  }
  return false;
}

function boxInside(box: Box, bounds: Box): boolean {
  return box.left >= bounds.left
    && box.top >= bounds.top
    && box.right <= bounds.right
    && box.bottom <= bounds.bottom;
}

export function forecastLabelPlacement(args: {
  paths: string[];
  end: Point;
  prev: Point;
  bounds: Box;
}): LinePointLabelPlacement {
  const samples = args.paths.flatMap(sampleSvgPath);
  const descending = args.end.y > args.prev.y + 1;
  const sides: Array<'below' | 'above' | 'right'> = descending
    ? ['below', 'above', 'right']
    : ['above', 'below', 'right'];
  const anchors: LinePointLabelPlacement[] = [];
  for (const gap of [10, 16, 24, 32, 44]) {
    for (const side of sides) {
      if (side === 'below') {
        anchors.push({
          x: args.end.x,
          y: args.end.y + gap,
          textAnchor: 'end',
          dominantBaseline: 'hanging',
        });
      } else if (side === 'above') {
        anchors.push({
          x: args.end.x,
          y: args.end.y - gap,
          textAnchor: 'end',
          dominantBaseline: 'auto',
        });
      } else {
        anchors.push({
          x: args.end.x + gap,
          y: args.end.y - FORECAST_FONT / 2,
          textAnchor: 'start',
          dominantBaseline: 'hanging',
        });
      }
    }
  }

  const clear = samples.length < 2
    ? undefined
    : anchors.find((anchor) => {
      const box = forecastWordBox(anchor);
      return boxInside(box, args.bounds) && !labelHitsStroke(box, samples, 6);
    });
  if (clear) {
    return clear;
  }

  const inside = anchors.filter((anchor) => boxInside(forecastWordBox(anchor), args.bounds));
  return inside[0] ?? anchors[0] ?? {
    x: args.end.x,
    y: args.end.y - 10,
    textAnchor: 'end',
    dominantBaseline: 'auto',
  };
}

export interface LinePointLabelPlacement {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'auto' | 'hanging';
}

export function separateLabelYs(
  anchors: readonly number[],
  gap: number,
  min: number,
  max: number
): number[] {
  if (anchors.length === 0) {
    return [];
  }
  const order = anchors
    .map((y, index) => ({ y, index }))
    .sort((left, right) => left.y - right.y || left.index - right.index);
  const placed = order.map((item) => item.y);
  const push = () => {
    for (let index = 1; index < placed.length; index += 1) {
      const floor = (placed[index - 1] ?? 0) + gap;
      if ((placed[index] ?? 0) < floor) {
        placed[index] = floor;
      }
    }
  };
  push();
  const overflow = (placed[placed.length - 1] ?? 0) - max;
  if (overflow > 0) {
    for (let index = 0; index < placed.length; index += 1) {
      placed[index] = (placed[index] ?? 0) - overflow;
    }
  }
  const underflow = min - (placed[0] ?? 0);
  if (underflow > 0) {
    for (let index = 0; index < placed.length; index += 1) {
      placed[index] = (placed[index] ?? 0) + underflow;
    }
  }
  push();
  const result = new Array<number>(anchors.length);
  order.forEach((item, index) => {
    result[item.index] = placed[index] ?? item.y;
  });
  return result;
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
