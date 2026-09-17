/** Models compose may call, in fallback order. Separate providers so one free-tier RPM cannot stall generate. */
export const COMPOSE_MODELS = [
  'openai/gpt-4.1-mini',
  'groq/llama-3.3-70b-versatile',
  'anthropic/claude-haiku-4.5',
  'xai/grok-3-mini',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
] as const;

export const LOOKUP_MODEL = 'groq/llama-3.3-70b-versatile';

export const LOOKUP_SONAR_MODEL = 'perplexity/sonar';

export const HINT_MODEL = 'groq/llama-3.3-70b-versatile';

export const STACK_MODELS = [...new Set([...COMPOSE_MODELS, LOOKUP_MODEL, LOOKUP_SONAR_MODEL, HINT_MODEL])];
