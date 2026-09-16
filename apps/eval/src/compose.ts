import { scoreCase } from './score';
import type { EvalCase, EvalDraft, EvalPrompt } from './types';

export type ComposeDraftFn = (
  prompt: EvalPrompt,
  model: string,
  seed: number
) => Promise<EvalDraft>;

/**
 * Live compose is opt-in and costs gateway tokens.
 * Pass a mapper (HTTP to share, or a stub in tests).
 */
export async function runComposeBatch(args: {
  prompts: EvalPrompt[];
  models: string[];
  seeds: number[];
  compose: ComposeDraftFn;
}): Promise<EvalCase[]> {
  const cases: EvalCase[] = [];
  for (const prompt of args.prompts) {
    for (const model of args.models) {
      for (const seed of args.seeds) {
        const draft = await args.compose(prompt, model, seed);
        cases.push(scoreCase(prompt, draft, model, seed));
      }
    }
  }
  return cases;
}
