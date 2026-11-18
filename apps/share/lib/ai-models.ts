/** gpt-4.1-mini is first so a Google free-tier RPM does not stall compose. */
export const COMPOSE_MODELS = [
  'openai/gpt-4.1-mini',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
] as const;

export const LOOKUP_MODEL = 'google/gemini-2.5-flash-lite';

export const LOOKUP_SONAR_MODEL = 'perplexity/sonar';

export const HINT_MODEL = 'google/gemini-2.5-flash-lite';

export const REVISION_HINT_MODEL = 'google/gemini-2.5-flash-lite';

export const INSIGHT_MODELS = ['openai/gpt-4.1-mini', 'google/gemini-2.5-flash-lite'] as const;

export const STACK_MODELS = [
  ...new Set<string>([
    ...COMPOSE_MODELS,
    LOOKUP_MODEL,
    LOOKUP_SONAR_MODEL,
    HINT_MODEL,
    REVISION_HINT_MODEL,
    ...INSIGHT_MODELS,
  ]),
];
