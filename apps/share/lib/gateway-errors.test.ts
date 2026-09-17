import { describe, expect, it } from 'vitest';
import {
  composeModelsForRevision,
  isGatewayRateLimited,
  shouldSkipGoogleModel,
} from './gateway-errors';

describe('isGatewayRateLimited', () => {
  it('matches the Gateway free-tier 429 compose actually throws', () => {
    const error = new Error(
      'Failed after 3 attempts. Last error: GatewayRateLimitError: Free tier requests on this model are rate-limited. Upgrade to paid credits'
    );
    expect(isGatewayRateLimited(error)).toBe(true);
  });

  it('does not treat a schema miss as a rate limit', () => {
    expect(isGatewayRateLimited(new Error('No object generated: response did not match schema'))).toBe(
      false
    );
  });
});

describe('composeModelsForRevision', () => {
  it('starts on OpenAI so generate is not stuck on Google free-tier RPM', () => {
    expect(composeModelsForRevision(false)[0]).toBe('openai/gpt-4.1-mini');
    expect(composeModelsForRevision(true)[0]).toBe('openai/gpt-4.1-mini');
    expect(composeModelsForRevision(false)).toContain('anthropic/claude-haiku-4.5');
  });
});

describe('shouldSkipGoogleModel', () => {
  it('skips Gemini after a Google 429 so OpenAI can run before the function times out', () => {
    expect(shouldSkipGoogleModel('google/gemini-2.5-flash-lite', true)).toBe(true);
    expect(shouldSkipGoogleModel('openai/gpt-4.1-mini', true)).toBe(false);
  });
});
