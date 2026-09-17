import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { isAiGatewayConfigured } from './ai-gateway';
import { logAiFromResult } from './ai-usage';
import { GATEWAY_NO_RETRY, isGatewayRateLimited } from './gateway-errors';
import { seedBriefing, type ChartSeed } from './seed';

/** OpenAI first — Google Flash-lite shares the Gateway free-tier RPM with compose. */
export const INSIGHT_MODELS = ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini'] as const;
export const MAX_LESSON_LAYERS = 5;

const InsightSchema = z.object({
  insight: z
    .string()
    .describe('Two short paragraphs, plain language, max about 120 words total'),
});

export type ChartLesson = {
  notice: string;
  teach: string;
  question: string;
  tryNext: string;
};

export type LessonPrior = {
  notice: string;
  question: string;
};

const SYSTEM = `You explain a chart to a smart reader who is not a specialist.
Write exactly two paragraphs separated by a blank line.
Paragraph 1: what the trend shows in plain words and why it matters.
Paragraph 2: how trustworthy the numbers likely are (source quality, gaps, caveats) plus one plausible driver or mechanism — no hype, no invented precision.
Use short sentences. No bullet points. No "In conclusion". Max 120 words total.
If sourceMethod is estimate or example, say so honestly. Do not invent URLs or statistics not in the chart.`;

const LessonSchema = z.object({
  notice: z.string().describe('One concrete thing in these rows a hurried reader would miss'),
  teach: z.string().describe('Two short paragraphs of reasoning, not chart-reading tips'),
  question: z.string().describe('One short engaging question, not a ranking quiz'),
  tryNext: z.string().describe('One imperative for a different chart on the same question'),
});

const LAYER_JOB = [
  `LAYER 1 — The mechanism. Why would a world that produced THESE rows look this way? Incentives, geography, measurement, timing, who reports. Do not teach chart literacy.`,
  `LAYER 2 — What the number conceals. Totals vs rates, the size of what is left, missing categories, a fat average hiding a split. Label guesses as guesses.`,
  `LAYER 3 — Two stories that both fit. Give competing explanations. What evidence would tell them apart — still no invented statistics.`,
  `LAYER 4 — What would have to change for the ranking or trend to flip. Policy, climate, a lag, a reporting rule, a one-time shock.`,
  `LAYER 5 — The uncomfortable implication. Who is missing from the x-axis, who benefits from this shape, and what a serious person would check next in the real world.`,
] as const;

const LESSON_SYSTEM = `You sit with a curious adult who already glanced at the chart and a short context blurb.
Go after the phenomenon in the rows. Do not explain how to read a bar, line, or scatter. Do not quiz them on which category is second-highest — they can see that.
Do not invent numbers, years, URLs, or precision that is not in ROWS.

notice: one specific pattern in THESE rows (name a real x label). One sentence.
teach: two short paragraphs, blank line between. Mechanism or comparison. Max 140 words. No "in conclusion".
question: ONE short sentence, under 110 characters. A small twist on what the numbers might mean — not a ranking quiz, not a lecture, not two clauses of preamble.
tryNext: one imperative for a NEW chart on the same question (a different cut: share, per person, over time, a missing comparison). Under 90 characters. Only years/labels that appear as x values.`;

class SkipCache extends Error {
  constructor() {
    super('skip-cache');
    this.name = 'SkipCache';
  }
}

function insightFingerprint(seed: ChartSeed): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title: seed.title,
        note: seed.note,
        rows: seed.rows,
        sourceLabel: seed.sourceLabel,
        sourceMethod: seed.sourceMethod,
      })
    )
    .digest('hex')
    .slice(0, 24);
}

function trimInsight(text: string): string {
  const cleaned = text.trim().replace(/\n{3,}/g, '\n\n');
  if (cleaned.length <= 900) {
    return cleaned;
  }
  return `${cleaned.slice(0, 897).trim()}…`;
}

function clip(text: string, max: number): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

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

export function isRankingQuiz(question: string): boolean {
  return /which (country|state|year|bar|category|one).{0,40}(highest|lowest|second|largest|smallest)/i.test(
    question
  );
}

export function sanitizeLesson(raw: ChartLesson): ChartLesson | null {
  const notice = clip(raw.notice, 240);
  const teach = trimInsight(raw.teach);
  const question = clip(raw.question, 140);
  const tryNext = clip(raw.tryNext, 120);
  if (notice.length < 12 || teach.length < 60 || question.length < 12 || tryNext.length < 8) {
    return null;
  }
  return { notice, teach, question, tryNext };
}

export function coerceLesson(raw: unknown): ChartLesson | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const tryNext =
    typeof item.tryNext === 'string'
      ? item.tryNext
      : typeof item.tryFresh === 'string'
        ? item.tryFresh
        : '';
  const question = typeof item.question === 'string' ? item.question : '';
  const notice = typeof item.notice === 'string' ? item.notice : '';
  const teach = typeof item.teach === 'string' ? item.teach : '';
  return sanitizeLesson({ notice, teach, question, tryNext });
}

export function heuristicInsight(seed: ChartSeed): string {
  const sorted = [...seed.rows].sort((a, b) => b.y - a.y);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const y = yWord(seed);
  const lead = top ? `${formatX(top.x)} sits at the high end of ${y}` : seed.title;
  const low = bottom && top && bottom !== top ? `, with ${formatX(bottom.x)} at the other end` : '';
  const method =
    seed.sourceMethod === 'official'
      ? 'These rows come from a named official source, so treat them as published figures, not a sketch.'
      : seed.sourceMethod === 'estimate' || seed.sourceMethod === 'example'
        ? 'These rows are an estimate or example. Do not treat them as a complete official series.'
        : `The source is listed as ${seed.sourceLabel || 'unspecified'}. Gaps and definitions still matter.`;
  return `${lead}${low}. ${seed.note ? `${seed.note} ` : ''}The shape is the story — not a single bar in isolation.\n\n${method} A plausible driver is how ${y} is counted, who is missing from the ${seed.xLabel || 'axis'}, or a lag between cause and what got published.`;
}

export function heuristicLesson(seed: ChartSeed, layer = 1): ChartLesson {
  const sorted = [...seed.rows].sort((a, b) => b.y - a.y);
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

function layerJob(layer: number): string {
  return LAYER_JOB[Math.min(MAX_LESSON_LAYERS, Math.max(1, layer)) - 1] ?? LAYER_JOB[0];
}

function priorBlock(prior: LessonPrior[]): string {
  if (prior.length === 0) {
    return '';
  }
  return `\n\nALREADY COVERED — do not repeat these claims or questions:\n${prior
    .map((item, index) => `${index + 1}. ${item.notice}\n   Q: ${item.question}`)
    .join('\n')}`;
}

async function generateInsightOnce(seed: ChartSeed): Promise<string | null> {
  if (!isAiGatewayConfigured()) {
    return null;
  }

  for (const model of INSIGHT_MODELS) {
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: InsightSchema }),
        system: SYSTEM,
        prompt: `${seedBriefing(seed)}\n\nWrite the two-paragraph explainer.`,
        maxOutputTokens: 280,
        maxRetries: GATEWAY_NO_RETRY,
      });
      await logAiFromResult('chart_insight', model, result.usage, result.totalUsage);
      const insight = trimInsight(result.output?.insight ?? '');
      if (insight.length >= 40) {
        return insight;
      }
    } catch (error) {
      console.error('chart insight failed', model, error);
      if (isGatewayRateLimited(error) && model.startsWith('google/')) {
        continue;
      }
    }
  }
  return null;
}

const cachedChartInsight = unstable_cache(
  async (fingerprint: string, seedJson: string) => {
    void fingerprint;
    const seed = JSON.parse(seedJson) as ChartSeed;
    if (!seed?.rows?.length) {
      throw new SkipCache();
    }
    const insight = await generateInsightOnce(seed);
    if (!insight) {
      throw new SkipCache();
    }
    return insight;
  },
  ['chart-insight-v5'],
  { revalidate: 60 * 60 * 24 * 7 }
);

export async function chartInsightForSeed(seed: ChartSeed): Promise<string> {
  try {
    return await cachedChartInsight(insightFingerprint(seed), JSON.stringify(seed));
  } catch {
    return heuristicInsight(seed);
  }
}

async function generateLessonOnce(
  seed: ChartSeed,
  insight: string | undefined,
  layer: number,
  prior: LessonPrior[]
): Promise<ChartLesson | null> {
  if (!isAiGatewayConfigured()) {
    return null;
  }

  for (const model of INSIGHT_MODELS) {
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: LessonSchema }),
        system: LESSON_SYSTEM,
        prompt: `${seedBriefing(seed)}${insight ? `\n\nTHEY ALREADY READ:\n${insight}` : ''}${priorBlock(prior)}\n\n${layerJob(layer)}\n\nWrite this layer.`,
        maxOutputTokens: 480,
        maxRetries: GATEWAY_NO_RETRY,
      });
      await logAiFromResult('chart_lesson', model, result.usage, result.totalUsage);
      const lesson = coerceLesson(result.output);
      if (lesson) {
        return lesson;
      }
    } catch (error) {
      console.error('chart lesson failed', model, error);
    }
  }
  return null;
}

const cachedChartLesson = unstable_cache(
  async (fingerprint: string, seedJson: string, insight: string, layer: number, priorJson: string) => {
    void fingerprint;
    const seed = JSON.parse(seedJson) as ChartSeed;
    if (!seed?.rows?.length) {
      throw new SkipCache();
    }
    const prior = JSON.parse(priorJson) as LessonPrior[];
    const lesson = await generateLessonOnce(
      seed,
      insight || undefined,
      layer,
      Array.isArray(prior) ? prior : []
    );
    if (!lesson) {
      throw new SkipCache();
    }
    return lesson;
  },
  ['chart-lesson-v5'],
  { revalidate: 60 * 60 * 24 * 7 }
);

export async function chartLessonForSeed(
  seed: ChartSeed,
  insight?: string,
  layer = 1,
  prior: LessonPrior[] = []
): Promise<ChartLesson> {
  const safeLayer = Math.min(MAX_LESSON_LAYERS, Math.max(1, Math.floor(layer)));
  const trimmedPrior = prior.slice(0, safeLayer - 1).map((item) => ({
    notice: item.notice.slice(0, 240),
    question: item.question.slice(0, 140),
  }));
  const fingerprint = `${insightFingerprint(seed)}:lesson:${safeLayer}:${createHash('sha256')
    .update(JSON.stringify(trimmedPrior))
    .digest('hex')
    .slice(0, 12)}`;
  try {
    return await cachedChartLesson(
      fingerprint,
      JSON.stringify(seed),
      (insight ?? '').slice(0, 900),
      safeLayer,
      JSON.stringify(trimmedPrior)
    );
  } catch {
    return heuristicLesson(seed, safeLayer);
  }
}
