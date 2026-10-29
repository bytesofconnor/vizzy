import { DATASETS } from '@vizzy/resolve';
import { keepsChartSubject, type ChartSeed } from './seed';
import {
  COMPOSE_DISPOSITIONS,
  type ClarifyAsk,
  type ClarifyOption,
  type ComposeDisposition,
} from './compose-outcome';

const mintBrand = Symbol('composeMint');

export type MintOrder = {
  readonly kind: 'mint';
  readonly prompt: string;
  readonly seed?: ChartSeed;
  readonly [mintBrand]: true;
};

export type ComposeDecision =
  | { readonly kind: 'reject'; readonly error: string }
  | { readonly kind: 'clarify'; readonly ask: ClarifyAsk }
  | MintOrder;

export type DecideInput = {
  prompt: unknown;
  disposition: unknown;
  seed?: ChartSeed;
};

const MEASURE =
  /\b(gdp|unemployment|inflation|jobs|wages|payrolls?|cpi|prices|recession|stocks|fed(?:eral)? funds|interest rates?|growth|deficit|debt|housing|employment|income|poverty|retail)\b/i;

const PROMPT_MAX = 4000;

function isDisposition(value: unknown): value is ComposeDisposition {
  return typeof value === 'string' && (COMPOSE_DISPOSITIONS as readonly string[]).includes(value);
}

function mintOrder(prompt: string, seed?: ChartSeed): MintOrder {
  return seed ? { kind: 'mint', prompt, seed, [mintBrand]: true } : { kind: 'mint', prompt, [mintBrand]: true };
}

function chips(question: string, a: ClarifyOption, b: ClarifyOption, c: ClarifyOption): ClarifyAsk {
  return { question, options: [a, b, c] };
}

function aliasKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesAlias(trimmed: string): boolean {
  const keys = new Set([aliasKey(trimmed), aliasKey(trimmed.replace(/[.!?]+$/u, ''))]);
  for (const dataset of DATASETS) {
    for (const alias of dataset.aliases) {
      if (keys.has(aliasKey(alias))) {
        return true;
      }
    }
  }
  return false;
}

function economyAsk(text: string): ClarifyAsk | undefined {
  if (!/\beconom(?:y|ic)\b/i.test(text)) {
    return undefined;
  }
  if (!/\b(better|worse|improving|improved|stronger|weaker)\b/i.test(text)) {
    return undefined;
  }
  if (MEASURE.test(text)) {
    return undefined;
  }
  return chips(
    'Which measure should the chart use?',
    { label: 'GDP', prompt: `${text} GDP` },
    { label: 'Unemployment', prompt: `${text} unemployment` },
    { label: 'Prices', prompt: `${text} prices` }
  );
}

function vagueHousing(text: string): boolean {
  const stripped = text.replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:the\s+)?housing(?:\s+market)?$/i.test(stripped);
}

function housingAsk(): ClarifyAsk {
  return chips(
    'Which housing series should the chart use?',
    { label: 'Housing starts', prompt: 'US housing starts' },
    { label: 'Median home price', prompt: 'US median home price' },
    { label: 'Case-Shiller', prompt: 'US Case-Shiller home price index' }
  );
}

function bareWordAsk(text: string): ClarifyAsk | undefined {
  const stripped = text.replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!/^\p{L}+$/u.test(stripped)) {
    return undefined;
  }
  if (MEASURE.test(stripped)) {
    return undefined;
  }
  const word = stripped.toLowerCase();
  return chips(
    `What should the ${word} chart measure?`,
    { label: 'Price', prompt: `${word} price` },
    { label: 'By country', prompt: `${word} by country` },
    { label: 'Over time', prompt: `${word} over time` }
  );
}

function clarifyOrMint(trimmed: string, seed: ChartSeed | undefined, ask: ClarifyAsk): ComposeDecision {
  // An option prompt over 4000 characters would be rejected on the next POST.
  if (ask.options.some((option) => option.prompt.length > PROMPT_MAX)) {
    return mintOrder(trimmed, seed);
  }
  return { kind: 'clarify', ask };
}

export function decideCompose(input: DecideInput): ComposeDecision {
  if (typeof input.prompt !== 'string') {
    return { kind: 'reject', error: 'prompt required' };
  }
  const trimmed = input.prompt.trim();
  if (trimmed.length < 3) {
    return { kind: 'reject', error: 'Say what to chart' };
  }
  if (trimmed.length > PROMPT_MAX) {
    return { kind: 'reject', error: 'Keep it under 4000 characters' };
  }

  let disposition: ComposeDisposition = 'ask';
  if (input.disposition !== undefined) {
    if (!isDisposition(input.disposition)) {
      return { kind: 'reject', error: 'disposition must be ask or send' };
    }
    disposition = input.disposition;
  }

  const seed = input.seed && keepsChartSubject(trimmed) ? input.seed : undefined;

  if (vagueHousing(trimmed)) {
    if (disposition === 'send') {
      return mintOrder('US housing starts');
    }
    return clarifyOrMint(trimmed, undefined, housingAsk());
  }

  if (disposition === 'send') {
    return mintOrder(trimmed, seed);
  }
  if (seed !== undefined) {
    return mintOrder(trimmed, seed);
  }
  if (matchesAlias(trimmed)) {
    return mintOrder(trimmed);
  }

  const economy = economyAsk(trimmed);
  if (economy) {
    return clarifyOrMint(trimmed, seed, economy);
  }
  const bare = bareWordAsk(trimmed);
  if (bare) {
    return clarifyOrMint(trimmed, seed, bare);
  }
  return mintOrder(trimmed);
}
