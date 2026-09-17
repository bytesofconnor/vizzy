/** Models compose may call, in fallback order. OpenAI first — Google Flash free-tier RPM is shared with lookup/hints. */
export const COMPOSE_MODELS = [
  'openai/gpt-4.1-mini',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
] as const;

export const LOOKUP_MODEL = 'openai/gpt-4.1-mini';

export const LOOKUP_SONAR_MODEL = 'perplexity/sonar';

export const HINT_MODEL = 'openai/gpt-4.1-mini';

export const STACK_MODELS = [...new Set([...COMPOSE_MODELS, LOOKUP_MODEL, LOOKUP_SONAR_MODEL, HINT_MODEL])];
