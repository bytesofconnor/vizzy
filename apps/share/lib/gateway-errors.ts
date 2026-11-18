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

export type ModelFailure = 'not_found' | 'forbidden' | 'rate_limit' | 'schema' | 'error';

export function classifyGatewayFailure(error: unknown): ModelFailure {
  const text = errorText(error);
  if (/GatewayModelNotFoundError|model[_ ]not[_ ]found|does not exist|no such model/i.test(text)) {
    return 'not_found';
  }
  if (/free tier users do not have access|\b403\b|forbidden/i.test(text)) {
    return 'forbidden';
  }
  if (isGatewayRateLimited(error)) {
    return 'rate_limit';
  }
  if (/invalid schema|response_format|Missing '/i.test(text)) {
    return 'schema';
  }
  return 'error';
}

/**
 * Same stack for generate and revise. Each model is tried in order; a 429 does not skip the rest of that provider.
 */
export function composeModelsForRevision(_revision: boolean): readonly (typeof COMPOSE_MODELS)[number][] {
  return COMPOSE_MODELS;
}
