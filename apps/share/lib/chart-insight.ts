import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { isAiGatewayConfigured } from './ai-gateway';
import { logAiFromResult } from './ai-usage';
import { seedBriefing, type ChartSeed } from './seed';

export const INSIGHT_MODEL = 'google/gemini-2.5-flash-lite';

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

const SYSTEM = `You explain a chart to a smart reader who is not a specialist.
Write exactly two paragraphs separated by a blank line.
Paragraph 1: what the trend shows in plain words and why it matters.
Paragraph 2: how trustworthy the numbers likely are (source quality, gaps, caveats) plus one plausible driver or mechanism — no hype, no invented precision.
Use short sentences. No bullet points. No "In conclusion". Max 120 words total.
If sourceMethod is estimate or example, say so honestly. Do not invent URLs or statistics not in the chart.`;

const LessonSchema = z.object({
  notice: z.string().describe('One concrete thing in these rows a hurried reader would miss'),
  teach: z.string().describe('Two short paragraphs: mechanism, then how to read this kind of chart'),
  question: z.string().describe('One question they can answer from this chart'),
  tryNext: z.string().describe('One imperative revise prompt to explore further'),
});

const LESSON_SYSTEM = `You are a patient teacher sitting with one chart and a curious reader.
They already read a short context blurb. Do not repeat it. Do not invent numbers, years, or URLs.
notice: one specific pattern in THESE rows (name a real x label and what the y is doing).
teach: two short paragraphs, blank line between. First, the mechanism or comparison that explains the shape. Second, how to read this kind of chart next time (rate vs level, incomplete year, log-looking jumps, stacked groups). Max 140 words.
question: one question they can answer from the table — not a riddle, not homework they cannot see.
tryNext: one imperative sentence they could type to revise the chart and learn more. Under 90 characters. Do not mention years that are not x values.`;

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

async function aiInsightUncached(seed: ChartSeed): Promise<string | null> {
  if (!isAiGatewayConfigured()) {
    return null;
  }

  try {
    const result = await generateText({
      model: INSIGHT_MODEL,
      output: Output.object({ schema: InsightSchema }),
      system: SYSTEM,
      prompt: `${seedBriefing(seed)}\n\nWrite the two-paragraph explainer.`,
      maxOutputTokens: 280,
      maxRetries: 0,
    });
    await logAiFromResult('chart_insight', INSIGHT_MODEL, result.usage, result.totalUsage);
    const insight = trimInsight(result.output.insight);
    return insight.length >= 40 ? insight : null;
  } catch (error) {
    console.error('chart insight failed', error);
    return null;
  }
}

const cachedChartInsight = unstable_cache(
  async (fingerprint: string, seedJson: string) => {
    void fingerprint;
    try {
      const seed = JSON.parse(seedJson) as ChartSeed;
      if (!seed?.rows?.length) {
        return null;
      }
      return aiInsightUncached(seed);
    } catch {
      return null;
    }
  },
  ['chart-insight-v1'],
  { revalidate: 60 * 60 * 24 * 7 }
);

export async function chartInsightForSeed(seed: ChartSeed): Promise<string | null> {
  const fingerprint = insightFingerprint(seed);
  return cachedChartInsight(fingerprint, JSON.stringify(seed));
}

function clip(text: string, max: number): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

export function sanitizeLesson(raw: ChartLesson): ChartLesson | null {
  const notice = clip(raw.notice, 220);
  const teach = trimInsight(raw.teach);
  const question = clip(raw.question, 220);
  const tryNext = clip(raw.tryNext, 120);
  if (notice.length < 12 || teach.length < 60 || question.length < 12 || tryNext.length < 8) {
    return null;
  }
  return { notice, teach, question, tryNext };
}

async function aiLessonUncached(seed: ChartSeed, insight?: string): Promise<ChartLesson | null> {
  if (!isAiGatewayConfigured()) {
    return null;
  }

  try {
    const result = await generateText({
      model: INSIGHT_MODEL,
      output: Output.object({ schema: LessonSchema }),
      system: LESSON_SYSTEM,
      prompt: `${seedBriefing(seed)}${insight ? `\n\nTHEY ALREADY READ:\n${insight}` : ''}\n\nWrite the closer look.`,
      maxOutputTokens: 420,
      maxRetries: 0,
    });
    await logAiFromResult('chart_lesson', INSIGHT_MODEL, result.usage, result.totalUsage);
    return sanitizeLesson(result.output);
  } catch (error) {
    console.error('chart lesson failed', error);
    return null;
  }
}

const cachedChartLesson = unstable_cache(
  async (fingerprint: string, seedJson: string, insight: string) => {
    void fingerprint;
    try {
      const seed = JSON.parse(seedJson) as ChartSeed;
      if (!seed?.rows?.length) {
        return null;
      }
      return aiLessonUncached(seed, insight || undefined);
    } catch {
      return null;
    }
  },
  ['chart-lesson-v1'],
  { revalidate: 60 * 60 * 24 * 7 }
);

export async function chartLessonForSeed(seed: ChartSeed, insight?: string): Promise<ChartLesson | null> {
  const fingerprint = `${insightFingerprint(seed)}:lesson`;
  return cachedChartLesson(fingerprint, JSON.stringify(seed), (insight ?? '').slice(0, 900));
}
