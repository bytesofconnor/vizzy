import { logAiUsage } from './telemetry';

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

function readUsage(usage: UsageLike | undefined): { inputTokens: number; outputTokens: number } {
  if (!usage) {
    return { inputTokens: 0, outputTokens: 0 };
  }
  const inputTokens = usage.inputTokens ?? usage.promptTokens ?? 0;
  const outputTokens = usage.outputTokens ?? usage.completionTokens ?? 0;
  if (inputTokens > 0 || outputTokens > 0) {
    return { inputTokens, outputTokens };
  }
  const total = usage.totalTokens ?? 0;
  if (total > 0) {
    return { inputTokens: total, outputTokens: 0 };
  }
  return { inputTokens: 0, outputTokens: 0 };
}

export async function logAiFromResult(
  route: string,
  model: string,
  usage: UsageLike | undefined,
  totalUsage?: UsageLike
): Promise<void> {
  const primary = readUsage(totalUsage ?? usage);
  await logAiUsage({ route, model, ...primary });
}
