import { logAiUsage } from './telemetry';

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

export async function logAiFromResult(
  route: string,
  model: string,
  usage: UsageLike | undefined
): Promise<void> {
  if (!usage) {
    return;
  }
  const inputTokens = usage.inputTokens ?? usage.promptTokens ?? 0;
  const outputTokens = usage.outputTokens ?? usage.completionTokens ?? 0;
  if (inputTokens === 0 && outputTokens === 0) {
    return;
  }
  await logAiUsage({ route, model, inputTokens, outputTokens });
}
