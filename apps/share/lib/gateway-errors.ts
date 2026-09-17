import { COMPOSE_MODELS } from './ai-models';

/** AI SDK retries 429s by default, which burns the Gateway free-tier window. */
export const GATEWAY_NO_RETRY = 0;

export function errorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error ?? '');
  }
  const cause = error.cause instanceof Error ? error.cause.message : '';
  return `${error.name} ${error.message} ${cause}`.trim();
}

export function isGatewayRateLimited(error: unknown): boolean {
  return /rate.?limit|429|rate_limit_exceeded|GatewayRateLimitError|free tier requests/i.test(
    errorText(error)
  );
}

/** After a Google free-tier 429, skip the rest of the Google stack and try OpenAI. */
export function shouldSkipGoogleModel(model: string, googleLimited: boolean): boolean {
  return googleLimited && model.startsWith('google/');
}

/**
 * Generate can use Flash. A follow-up in the same minute usually cannot —
 * Flash and Flash-Lite share the Gateway free-tier RPM. Revise on OpenAI.
 */
export function composeModelsForRevision(revision: boolean): readonly (typeof COMPOSE_MODELS)[number][] {
  if (!revision) {
    return COMPOSE_MODELS;
  }
  return COMPOSE_MODELS.filter((model) => model.startsWith('openai/'));
}
