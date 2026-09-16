import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { isAiGatewayConfigured } from './ai-gateway';
import { logAiFromResult } from './ai-usage';
import { heuristicRevisionPrompts } from './revision-heuristics';
import { seedBriefing, type ChartSeed } from './seed';

export { heuristicRevisionPrompts } from './revision-heuristics';

export const REVISION_HINT_MODEL = 'google/gemini-2.5-flash-lite';

const RevisionSchema = z.object({
  prompts: z
    .array(z.string().describe('One short revision sentence the user could type'))
    .min(3)
    .max(5),
});

const SYSTEM = `You write short revision prompts for someone editing a chart they already have open.
Each line is one imperative sentence they would type into a revise box — not a question, not an explanation.
Good: "Sort by share. Drop anything under 5%." "Make it a line." "Keep India, Russia, and Nepal only."
Bad: "Would you like to..." "You could consider..."
Use real category names from the chart when it helps. Mention chart type changes, sorting, top-N, dropping outliers, or relabeling axes.
Do not ask them to paste new data unless the chart clearly has too few rows to compare.
Keep each prompt under 90 characters. Return exactly 4 prompts.`;

function uniquePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of prompts) {
    const prompt = raw.trim().replace(/\s+/g, ' ');
    if (prompt.length < 8 || prompt.length > 120) {
      continue;
    }
    const key = prompt.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(prompt);
  }
  return out;
}

function seedFingerprint(seed: ChartSeed): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title: seed.title,
        kicker: seed.kicker,
        chartType: seed.chartType,
        area: seed.area,
        xLabel: seed.xLabel,
        yLabel: seed.yLabel,
        rows: seed.rows,
      })
    )
    .digest('hex')
    .slice(0, 24);
}

async function aiRevisionPromptsUncached(seed: ChartSeed): Promise<string[] | null> {
  if (!isAiGatewayConfigured()) {
    return null;
  }

  const briefing = seedBriefing(seed);
  try {
    const result = await generateText({
      model: REVISION_HINT_MODEL,
      output: Output.object({ schema: RevisionSchema }),
      system: SYSTEM,
      prompt: `${briefing}\n\nSuggest four revision prompts tailored to this chart.`,
      maxOutputTokens: 220,
    });
    await logAiFromResult('revision_hints', REVISION_HINT_MODEL, result.usage, result.totalUsage);
    const cleaned = uniquePrompts(result.output.prompts);
    return cleaned.length >= 3 ? cleaned.slice(0, 5) : null;
  } catch (error) {
    console.error('revision hints failed', error);
    return null;
  }
}

const cachedAiRevisionPrompts = unstable_cache(
  async (fingerprint: string, seedJson: string) => {
    void fingerprint;
    const seed = parseCachedSeed(seedJson);
    if (!seed) {
      return null;
    }
    return aiRevisionPromptsUncached(seed);
  },
  ['revision-prompts-v1'],
  { revalidate: 60 * 60 * 24 * 7 }
);

function parseCachedSeed(seedJson: string): ChartSeed | null {
  try {
    const parsed: unknown = JSON.parse(seedJson);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const raw = parsed as ChartSeed;
    if (!Array.isArray(raw.rows) || raw.rows.length === 0) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export async function revisionPromptsForSeed(seed: ChartSeed): Promise<string[]> {
  const fallback = heuristicRevisionPrompts(seed);
  const fingerprint = seedFingerprint(seed);

  try {
    const ai = await cachedAiRevisionPrompts(fingerprint, JSON.stringify(seed));
    if (ai && ai.length >= 3) {
      return ai;
    }
  } catch (error) {
    console.error('revision prompts cache failed', error);
  }

  return fallback;
}
