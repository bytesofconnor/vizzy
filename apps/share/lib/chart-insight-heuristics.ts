import { figureRows, rankFigures, type ChartSeed } from './seed';
import { alignAttribution } from './source';
import { drawnYearSpan, spanLabel, withDrawnSpan, yearFromX } from './year-span';

export const MAX_LESSON_LAYERS = 5;

export type ChartLesson = {
  notice: string;
  teach: string;
  question: string;
  tryNext: string;
};

function formatX(value: string | number): string {
  const text = String(value).trim();
  return text.length > 28 ? `${text.slice(0, 25)}…` : text;
}

function yWord(seed: ChartSeed): string {
  const label = seed.yLabel.trim();
  if (!label || /^y$/i.test(label)) {
    return 'the numbers';
  }
  return label;
}

function formatPct(value: number): string {
  const tenths = Math.round(value * 10) / 10;
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
}

function valueAtYear(rows: ChartSeed['rows'], year: number): number | undefined {
  let found: number | undefined;
  for (const row of rows) {
    if (row.y === null || !Number.isFinite(row.y) || yearFromX(row.x) !== year) {
      continue;
    }
    found = row.y;
  }
  return found;
}

export function alignYearPercents(text: string, rows: ChartSeed['rows']): string {
  const beforeYear = text.replace(
    /(\d+(?:\.\d+)?)(\s*%)(\s*(?:in|for|during)\s+)((?:19|20)\d{2})\b/gi,
    (full, _num, pct, mid, year) => {
      const value = valueAtYear(rows, Number(year));
      if (value === undefined) {
        return full;
      }
      return `${formatPct(value)}${pct}${mid}${year}`;
    }
  );
  return beforeYear.replace(
    /(\b(?:in|for|during)\s+)((?:19|20)\d{2})\b([^.]{0,48}?)(\d+(?:\.\d+)?)(\s*%)/gi,
    (full, prefix, year, mid, _num, pct) => {
      const value = valueAtYear(rows, Number(year));
      if (value === undefined) {
        return full;
      }
      return `${prefix}${year}${mid}${formatPct(value)}${pct}`;
    }
  );
}

function citedYearPercent(seed: ChartSeed): { year: number; label: string } | null {
  if (!/%|percent|\bshare\b/i.test(seed.yLabel) || drawnYearSpan(seed.rows) === null) {
    return null;
  }
  if (new Set(seed.rows.map((row) => row.series).filter(Boolean)).size > 1) {
    return null;
  }
  let last: { year: number; y: number } | undefined;
  for (const row of seed.rows) {
    const year = yearFromX(row.x);
    if (year === undefined || row.y === null || !Number.isFinite(row.y)) {
      continue;
    }
    if (!last || year >= last.year) {
      last = { year, y: row.y };
    }
  }
  if (!last) {
    return null;
  }
  return { year: last.year, label: `${formatPct(last.y)}%` };
}

export function alignContext(text: string, seed: ChartSeed): string {
  return alignAttribution(alignYearPercents(withDrawnSpan(text, seed.rows), seed.rows), {
    label: seed.sourceLabel,
    url: seed.sourceUrl,
  });
}

export function heuristicInsight(seed: ChartSeed): string {
  const sorted = figureRows(rankFigures(seed.rows));
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const y = yWord(seed);
  const lead = top ? `${formatX(top.x)} sits at the high end of ${y}` : seed.title;
  const low = bottom && top && bottom !== top ? `, with ${formatX(bottom.x)} at the other end` : '';
  const span = drawnYearSpan(seed.rows);
  const cited = citedYearPercent(seed);
  const fact = [
    cited ? `In ${cited.year} the chart reads ${cited.label}.` : '',
    span ? `The years on the axis are ${spanLabel(span)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const method =
    seed.sourceMethod === 'official'
      ? 'These rows come from a named official source, so treat them as published figures, not a sketch.'
      : seed.sourceMethod === 'estimate' || seed.sourceMethod === 'example'
        ? 'These rows are an estimate or example. Do not treat them as a complete official series.'
        : `The source is listed as ${seed.sourceLabel || 'unspecified'}. Gaps and definitions still matter.`;
  const text = `${lead}${low}.${fact ? ` ${fact}` : ''} ${seed.note ? `${seed.note} ` : ''}The shape is the story — not a single bar in isolation.\n\n${method} A plausible driver is how ${y} is counted, who is missing from the ${seed.xLabel || 'axis'}, or a lag between cause and what got published.`;
  return alignContext(text, seed);
}

export function heuristicLesson(seed: ChartSeed, layer = 1): ChartLesson {
  const sorted = figureRows(rankFigures(seed.rows));
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const mid = sorted[Math.floor(sorted.length / 2)];
  const y = yWord(seed);
  const hi = top ? formatX(top.x) : 'the leader';
  const lo = bottom ? formatX(bottom.x) : 'the tail';
  const midLabel = mid ? formatX(mid.x) : 'the middle';
  const index = Math.min(MAX_LESSON_LAYERS, Math.max(1, layer)) - 1;
  const pack: ChartLesson[] = [
    {
      notice: `${hi} leads on ${y}, well ahead of ${lo}.`,
      teach: `That gap is usually size, timing, or how ${y} is counted — not a simple contest.\n\nA small move in ${hi} would not reorder this chart. A change in units or who is missing from the axis could.`,
      question: `Is ${hi} large, or just measured that way?`,
      tryNext: `Show ${y} as a share or per person, not the raw total.`,
    },
    {
      notice: `${lo} is easy to skip once ${hi} fills the frame.`,
      teach: `Rankings hide rates. A smaller ${seed.xLabel || 'category'} can be changing faster than the leader.\n\nIf ${y} is a total, size does a lot of the work. Ask what the remaining stock or the denominator would do to ${midLabel}.`,
      question: `Would ${lo} jump if this were a rate?`,
      tryNext: `Chart the same ${y} as a rate or a share of the total.`,
    },
    {
      notice: `${hi} and ${lo} can fit two different stories at once.`,
      teach: `One story is real pressure where the rows are biggest. The other is reporting, a lag, or a one-time shock that did not hit everyone.\n\nNothing in this table can settle that alone. The next chart has to change the cut, not the palette.`,
      question: `Shock, or a slow build that only shows up here?`,
      tryNext: `Plot ${y} over time instead of this snapshot.`,
    },
    {
      notice: `The order would flip if ${hi} stalled and ${lo} kept moving.`,
      teach: `Policy, a reporting rule, or a lag can reorder this faster than a speech can.\n\nWatch whether the next published point confirms the tail or walks it back. Until then the last rows are the most fragile.`,
      question: `What would have to happen for ${lo} to pass the middle?`,
      tryNext: `Compare this year with the previous published year.`,
    },
    {
      notice: `Whoever is not on this ${seed.xLabel || 'axis'} is doing work the chart cannot show.`,
      teach: `${hi} is what got measured. That is not the same as everyone who matters.\n\nA serious next step is a missing comparison: another unit, another place, or the same ${y} as a share of what is left.`,
      question: `Who is missing from this chart on purpose?`,
      tryNext: `Add the missing comparison that would change how ${hi} looks.`,
    },
  ];
  return pack[index] ?? pack[0]!;
}
