import { alignPlottedClaims } from './plotted-claims';
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

function alignYearPercents(text: string, rows: ChartSeed['rows']): string {
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

function closeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || /[.!?]["']?$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}.`;
}

const MONTH_WORD =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
const YEAR_MONTH = /^(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])\b/;

function axisIsMonths(rows: ChartSeed['rows']): boolean {
  const labels = rows.map((row) => String(row.x).trim()).filter(Boolean);
  if (labels.length < 2) {
    return false;
  }
  const hits = labels.filter((label) => MONTH_WORD.test(label) || YEAR_MONTH.test(label)).length;
  return hits >= Math.ceil(labels.length * 0.7);
}

type Measure = 'temperature' | 'index' | 'per-capita' | 'share' | 'rate' | 'price' | 'extent' | 'total';

function measureOf(seed: ChartSeed): Measure {
  const text = `${seed.yLabel} ${seed.title}`.toLowerCase();
  if (/°\s*[cf]\b|\bcelsius\b|\bfahrenheit\b|\btemperature\b|\banomaly\b/.test(text)) {
    return 'temperature';
  }
  if (/\bindex\b|\bcpi\b/.test(text)) {
    return 'index';
  }
  if (/\bper (?:person|capita|head)\b/.test(text)) {
    return 'per-capita';
  }
  if (/\bshare\b|%\s*of\b/.test(text)) {
    return 'share';
  }
  if (/%|\bpercent\b|\brates?\b|\bratio\b/.test(text)) {
    return 'rate';
  }
  if (/\$|\busd\b|\bdollars?\b|\bprice\b|\bcents?\b|\bper pound\b|\bper barrel\b/.test(text)) {
    return 'price';
  }
  if (/\bextent\b|km²|km2|\bhectares?\b|\bacres?\b/.test(text)) {
    return 'extent';
  }
  return 'total';
}

const FITTING_TIP: Record<Measure, (y: string) => string> = {
  temperature: (y) => `Plot the change in ${y} from the prior year.`,
  index: (y) => `Plot the change in ${y} from the prior period.`,
  'per-capita': (y) => `Plot the change in ${y} from the prior period.`,
  share: (y) => `Plot how ${y} changed over time.`,
  rate: (y) => `Plot the change in ${y} from the prior period.`,
  price: (y) => `Plot the change in ${y} from the prior period.`,
  extent: (y) => `Plot the change in ${y} from the prior period.`,
  total: (y) => `Show ${y} as a share or per person, not the raw total.`,
};

function seasonalCycle(rows: ChartSeed['rows']): boolean {
  const labels = rows.map((row) => String(row.x).trim()).filter(Boolean);
  if (labels.length < 2) {
    return false;
  }
  const hits = labels.filter((label) => MONTH_WORD.test(label) && !/(?:19|20)\d{2}/.test(label)).length;
  return hits >= Math.ceil(labels.length * 0.7);
}

function firstTip(seed: ChartSeed, y: string): string {
  if (seasonalCycle(seed.rows)) {
    return `Compare ${y} with the month before.`;
  }
  if (axisIsMonths(seed.rows)) {
    return `Compare ${y} with the same month a year earlier.`;
  }
  return FITTING_TIP[measureOf(seed)](y);
}

function secondTip(seed: ChartSeed, y: string): string {
  if (measureOf(seed) === 'total') {
    return `Chart the same ${y} as a rate or a share of the total.`;
  }
  return `Compare ${y} with an earlier published point.`;
}

function formatValue(value: number, yLabel: string): string {
  if (/%|percent/i.test(yLabel)) {
    return `${formatPct(value)}%`;
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function timeEndpoints(
  seed: ChartSeed
): { first: { x: string | number; y: number }; last: { x: string | number; y: number } } | null {
  if (drawnYearSpan(seed.rows) === null) {
    return null;
  }
  const timed = seed.rows.filter(
    (row): row is { x: string | number; y: number; series?: string } =>
      yearFromX(row.x) !== undefined && row.y !== null && Number.isFinite(row.y)
  );
  if (timed.length < 2) {
    return null;
  }
  const ordered = [...timed].sort((a, b) => {
    const ay = yearFromX(a.x) ?? 0;
    const by = yearFromX(b.x) ?? 0;
    if (ay !== by) {
      return ay - by;
    }
    return String(a.x).localeCompare(String(b.x));
  });
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last || String(first.x) === String(last.x)) {
    return null;
  }
  return { first, last };
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
  return alignPlottedClaims(
    alignAttribution(alignYearPercents(withDrawnSpan(text, seed.rows), seed.rows), {
      label: seed.sourceLabel,
      url: seed.sourceUrl,
    }),
    seed.rows
  );
}

export function unpublishedSketch(seed: ChartSeed): boolean {
  return !seed.sourceUrl && (seed.sourceMethod === 'estimate' || seed.sourceMethod === 'example');
}

export function heuristicInsight(seed: ChartSeed): string {
  if (unpublishedSketch(seed)) {
    return 'No published series backs this chart. These rows are not measurements, so this note does not describe them as facts.';
  }
  const sorted = figureRows(rankFigures(seed.rows));
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const y = yWord(seed);
  const ends = timeEndpoints(seed);
  const seriesNames = [...new Set(seed.rows.map((row) => row.series).filter((name): name is string => Boolean(name)))];
  const lead = ends
    ? seriesNames.length >= 2
      ? `From ${formatX(ends.first.x)} to ${formatX(ends.last.x)}, ${seriesNames.join(' and ')} are plotted together`
      : `From ${formatX(ends.first.x)} to ${formatX(ends.last.x)}, ${y} went from ${formatValue(ends.first.y, seed.yLabel)} to ${formatValue(ends.last.y, seed.yLabel)}`
    : top
      ? `${formatX(top.x)} sits at the high end of ${y}`
      : seed.title;
  const low = !ends && bottom && top && bottom !== top ? `, with ${formatX(bottom.x)} at the other end` : '';
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
  const noted = seed.note.trim() ? ` ${closeSentence(seed.note)}` : '';
  const text = `${lead}${low}.${fact ? ` ${fact}` : ''}${noted} The shape is the story — not a single bar in isolation.\n\n${method} A plausible driver is how ${y} is counted, who is missing from the ${seed.xLabel || 'axis'}, or a lag between cause and what got published.`;
  return alignContext(text, seed);
}

export function heuristicLesson(seed: ChartSeed, layer = 1): ChartLesson {
  if (unpublishedSketch(seed)) {
    return {
      notice: 'No published series backs this chart.',
      teach:
        'These rows are not measurements. A publisher and a page are what make a series real.\n\nReading a ranking into them would state a fact the chart does not have.',
      question: 'Which published series should this chart use?',
      tryNext: 'Chart a published series on this question.',
    };
  }
  const sorted = figureRows(rankFigures(seed.rows));
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const mid = sorted[Math.floor(sorted.length / 2)];
  const y = yWord(seed);
  const ends = timeEndpoints(seed);
  const hi = ends ? formatX(ends.first.x) : top ? formatX(top.x) : 'the leader';
  const lo = ends ? formatX(ends.last.x) : bottom ? formatX(bottom.x) : 'the tail';
  const midLabel = mid ? formatX(mid.x) : 'the middle';
  const index = Math.min(MAX_LESSON_LAYERS, Math.max(1, layer)) - 1;
  if (ends) {
    const startValue = formatValue(ends.first.y, seed.yLabel);
    const endValue = formatValue(ends.last.y, seed.yLabel);
    const timed: ChartLesson[] = [
      {
        notice: `${y} moved from ${startValue} in ${hi} to ${endValue} in ${lo}.`,
        teach: `The change across this whole span is the one the chart can support.\n\nA peak or a trough in between is a year inside the series, not a second series.`,
        question: `What would have to persist for the ${lo} reading to become the new normal?`,
        tryNext: firstTip(seed, y),
      },
      {
        notice: `${hi} and ${lo} are the ends of this ${y} series.`,
        teach: `Reading only the loudest year drops the path between the ends.\n\nThe next cut is the change from one published point to the next, still on this series.`,
        question: `Does the move from ${hi} to ${lo} survive a change in units?`,
        tryNext: secondTip(seed, y),
      },
      {
        notice: `Both a slow climb and a late jump can connect ${hi} to ${lo}.`,
        teach: `One story is a steady change in what ${y} measures. The other is a shock near one end.\n\nThe rows show the path. They do not name the cause.`,
        question: `Shock near ${lo}, or a build that started at ${hi}?`,
        tryNext: firstTip(seed, y),
      },
      {
        notice: `The ${lo} reading is only as solid as the next published point.`,
        teach: `A revision, a lag, or a reporting rule can move the end without touching ${hi}.\n\nUntil the next point lands, the latest reading is the fragile one.`,
        question: `What would the next point have to do to undo ${lo}?`,
        tryNext: secondTip(seed, y),
      },
      {
        notice: `The years before ${hi} are outside this chart.`,
        teach: `${hi} is where this cut starts, not where the phenomenon starts.\n\nA serious next look is the same ${y} on a longer published span.`,
        question: `What happened to ${y} before ${hi}?`,
        tryNext: firstTip(seed, y),
      },
    ];
    return alignLesson(timed[index] ?? timed[0]!, seed);
  }
  if (top && hi === lo) {
    const only: ChartLesson = {
      notice: `${hi} is the only category with a plotted ${y}.`,
      teach: `A lead needs a second published figure. This chart does not have one, so it cannot say ${hi} is ahead of itself.\n\nThe next chart has to add the missing comparison from the same source.`,
      question: `Which published comparison should sit next to ${hi}?`,
      tryNext: firstTip(seed, y),
    };
    return alignLesson(only, seed);
  }
  const pack: ChartLesson[] = [
    {
      notice: `${hi} leads on ${y}, well ahead of ${lo}.`,
      teach: `That gap is usually size, timing, or how ${y} is counted — not a simple contest.\n\nA small move in ${hi} would not reorder this chart. A change in units or who is missing from the axis could.`,
      question: `Is ${hi} large, or just measured that way?`,
      tryNext: firstTip(seed, y),
    },
    {
      notice: `${lo} is easy to skip once ${hi} fills the frame.`,
      teach: `Rankings hide rates. A smaller ${seed.xLabel || 'category'} can be changing faster than the leader.\n\nIf ${y} is a total, size does a lot of the work. Ask what the remaining stock or the denominator would do to ${midLabel}.`,
      question: `Would ${lo} jump if this were a rate?`,
      tryNext: secondTip(seed, y),
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
  return alignLesson(pack[index] ?? pack[0]!, seed);
}

function alignLesson(lesson: ChartLesson, seed: ChartSeed): ChartLesson {
  return {
    notice: alignPlottedClaims(lesson.notice, seed.rows),
    teach: alignPlottedClaims(lesson.teach, seed.rows),
    question: alignPlottedClaims(lesson.question, seed.rows),
    tryNext: alignPlottedClaims(lesson.tryNext, seed.rows),
  };
}
