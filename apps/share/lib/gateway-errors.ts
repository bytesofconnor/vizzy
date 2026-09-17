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
 * Same stack for generate and revise. Provider 429s are skipped in the compose loop.
 */
export function composeModelsForRevision(_revision: boolean): readonly (typeof COMPOSE_MODELS)[number][] {
  return COMPOSE_MODELS;
}
