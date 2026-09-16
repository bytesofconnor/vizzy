import { checkDraft } from './check';
import type { EvalCase, EvalDraft, EvalPrompt } from './types';

export function scoreCase(
  prompt: EvalPrompt,
  draft: EvalDraft,
  model: string,
  seed: number
): EvalCase {
  const issues = checkDraft(prompt, draft);
  return {
    promptId: prompt.id,
    model,
    seed,
    prompt,
    draft,
    pass: issues.length === 0,
    issues,
  };
}
