/** Models compose may call, in fallback order. */
export const COMPOSE_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-4.1-mini',
] as const;

export const LOOKUP_MODEL = 'google/gemini-2.5-flash-lite';

export const LOOKUP_SONAR_MODEL = 'perplexity/sonar';

export const STACK_MODELS = [...new Set([...COMPOSE_MODELS, LOOKUP_MODEL, LOOKUP_SONAR_MODEL])];
