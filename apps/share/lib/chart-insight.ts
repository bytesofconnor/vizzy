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

const SYSTEM = `You explain a chart to a smart reader who is not a specialist.
Write exactly two paragraphs separated by a blank line.
Paragraph 1: what the trend shows in plain words and why it matters.
Paragraph 2: how trustworthy the numbers likely are (source quality, gaps, caveats) plus one plausible driver or mechanism — no hype, no invented precision.
Use short sentences. No bullet points. No "In conclusion". Max 120 words total.
If sourceMethod is estimate or example, say so honestly. Do not invent URLs or statistics not in the chart.`;

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
