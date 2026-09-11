import { generateText, Output } from 'ai';
import { z } from 'zod';
import { mintPiece, type MintResult } from './mint';

const DraftSchema = z.object({
  title: z.string().describe('Short sentence that is the chart title'),
  kicker: z.string().describe('Two or three word label above the title'),
  note: z.string().describe('One dry sentence under the chart'),
  chartType: z.enum(['bar', 'line', 'scatter']),
  area: z.boolean().describe('True only for a line that should fill under the stroke'),
  x: z.string().describe('Column name for x. Must exist on every row'),
  y: z.string().describe('Numeric column name for y. Must exist on every row'),
  sourceLabel: z.string(),
  sourceMethod: z.enum(['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown']),
  evidence: z.string().describe('What the rows actually are, in a few words'),
  rows: z
    .array(z.record(z.union([z.string(), z.number()])))
    .min(2)
    .max(24),
});

const SYSTEM = `You emit a Vizzy chart draft. Types: bar, line, scatter only. No pie.
Use the user's numbers when they paste a table. Do not invent official statistics.
If they ask without numbers, invent a small plausible table and set sourceMethod to estimate or example. Say so in evidence.
y must be numeric. x is a column name on every row. Keep titles short.`;

export async function pieceFromPrompt(prompt: string): Promise<MintResult> {
  const asked = prompt.trim();
  if (asked.length < 3) {
    return { ok: false, error: 'Say what to chart', issues: [] };
  }
  if (asked.length > 4000) {
    return { ok: false, error: 'Keep it under 4000 characters', issues: [] };
  }

  const { output } = await generateText({
    model: 'openai/gpt-5.4',
    output: Output.object({ schema: DraftSchema }),
    system: SYSTEM,
    prompt: asked,
  });

  if (!output) {
    return { ok: false, error: 'Could not draft a chart', issues: [] };
  }

  return mintPiece({
    title: output.title,
    kicker: output.kicker,
    note: output.note,
    data: output.rows,
    source: {
      label: output.sourceLabel,
      method: output.sourceMethod,
      evidence: output.evidence,
    },
    config: {
      chart: {
        type: output.chartType,
        ...(output.chartType === 'line' && output.area ? { area: true, curve: 'linear' } : {}),
      },
      dataMapping: { x: output.x, y: output.y },
    },
  });
}
