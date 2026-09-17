import { PROMPT_IDEAS, type PromptIdea } from './prompt-ideas';
import { DUST } from './theme';

export type HeroIdea = {
  id: string;
  label: string;
  prompt: string;
  tone: string;
};

export const HERO_IDEAS_STORAGE_KEY = 'vizzy.hero-ideas.v4';
export const HERO_IDEA_MIN = 8;
export const HERO_IDEA_MAX = 10;

const HERO_FALLBACK_IDS = [
  'chips',
  'refugees',
  'un-votes',
  'solar',
  'life-expectancy',
  'smartphones',
  'co2',
  'languages',
  'unemployment',
  'inflation',
  'fed-funds',
  'fertility',
  'gdp-capita',
  'electricity',
  'ozone',
  'quakes',
] as const;

export const DEFAULT_HERO_IDEAS: HeroIdea[] = fallbackFromIds([
  'chips',
  'refugees',
  'fed-funds',
  'fertility',
  'un-votes',
  'solar',
  'gdp-capita',
  'smartphones',
]);

export function parseHeroIdeas(value: unknown): HeroIdea[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: HeroIdea[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (typeof row !== 'object' || row === null) {
      continue;
    }
    const raw = row as Record<string, unknown>;
    const label = asChipLabel(raw.label);
    const prompt = cleanPrompt(raw.prompt);
    if (!label || !prompt) {
      continue;
    }
    const key = prompt.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      id: slugIdea(label, out.length),
      label,
      prompt,
      tone: DUST[out.length % DUST.length] ?? DUST[0],
    });
  }
  return out.slice(0, HERO_IDEA_MAX);
}

export function isHeroIdeaBatch(ideas: readonly HeroIdea[]): boolean {
  return ideas.length >= HERO_IDEA_MIN && ideas.length <= HERO_IDEA_MAX;
}

export function fallbackHeroIdeas(exclude: readonly string[] = [], salt = 'vizzy'): HeroIdea[] {
  const blocked = new Set(exclude.map((item) => item.trim().toLowerCase()));
  const pool = HERO_FALLBACK_IDS.map((id) => PROMPT_IDEAS.find((idea) => idea.id === id)).filter(
    (idea): idea is PromptIdea => Boolean(idea)
  );
  const shuffled = shuffle(pool, salt).filter((idea) => !blocked.has(idea.prompt.toLowerCase()));
  const picked = (shuffled.length >= HERO_IDEA_MIN ? shuffled : pool).slice(0, HERO_IDEA_MIN);
  return picked.map((idea, index) => ({
    id: idea.id,
    label: chipLabel(idea),
    prompt: idea.prompt,
    tone: idea.tone || DUST[index % DUST.length],
  }));
}

function fallbackFromIds(ids: readonly string[]): HeroIdea[] {
  return ids
    .map((id) => PROMPT_IDEAS.find((idea) => idea.id === id))
    .filter((idea): idea is PromptIdea => Boolean(idea))
    .map((idea, index) => ({
      id: idea.id,
      label: chipLabel(idea),
      prompt: idea.prompt,
      tone: idea.tone || DUST[index % DUST.length],
    }));
}

function chipLabel(idea: PromptIdea): string {
  const named: Record<string, string> = {
    ozone: 'Did Montreal actually heal ozone',
    quakes: 'Where the biggest quakes cluster',
    languages: 'How far ahead Mandarin still is',
    'life-expectancy': 'Who gained the most years alive',
    co2: 'Where Mauna Loa CO₂ finally bends',
    solar: 'Who crossed 10% solar first',
    chips: 'How much of the future Taiwan makes',
    smartphones: 'When the iPhone actually passed Nokia',
    refugees: 'Who hosts the most people relative to size',
    'un-votes': 'How the UN votes on Ukraine split',
    unemployment: 'Which US recoveries never brought jobs back',
    inflation: 'When the CPI spike actually broke',
    'fed-funds': 'How violent the Fed hiking cycles were',
    fertility: 'Who stopped having enough children',
    'gdp-capita': 'Who pulled away on GDP per person',
    electricity: 'Who closed the last electricity gaps',
  };
  return named[idea.id] ?? asChipLabel(idea.id.replace(/-/g, ' '));
}

export function asChipLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.replace(/\s+/g, ' ').replace(/[.?!]+$/g, '').trim();
  const words = trimmed.split(' ').filter(Boolean);
  if (words.length < 3 || words.length > 10) {
    return '';
  }
  const label = words.map((word, index) => chipWord(word, index)).join(' ');
  if (label.length < 12 || label.length > 56) {
    return '';
  }
  return label;
}

const CHIP_WORDS: Record<string, string> = {
  cds: 'CDs',
  cd: 'CD',
  co2: 'CO₂',
  'co₂': 'CO₂',
  us: 'US',
  'u.s.': 'U.S.',
  gdp: 'GDP',
  un: 'UN',
  cpi: 'CPI',
  mauna: 'Mauna',
  loa: 'Loa',
  montreal: 'Montreal',
  eurovision: 'Eurovision',
  olympic: 'Olympic',
  olympics: 'Olympics',
  arctic: 'Arctic',
  antarctic: 'Antarctic',
  keeling: 'Keeling',
  kepler: 'Kepler',
  jwst: 'JWST',
  apollo: 'Apollo',
  china: 'China',
  russia: 'Russia',
  nato: 'NATO',
  taiwan: 'Taiwan',
  india: 'India',
  nokia: 'Nokia',
  iphone: 'iPhone',
  mandarin: 'Mandarin',
  ukraine: 'Ukraine',
  fed: 'Fed',
};

function chipWord(word: string, index: number): string {
  const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9.₂]+)([^a-zA-Z0-9]*)$/);
  if (!match) {
    return index === 0 ? capFirst(word.toLowerCase()) : word.toLowerCase();
  }
  const lead = match[1] ?? '';
  const core = match[2] ?? word;
  const tail = match[3] ?? '';
  const mapped = CHIP_WORDS[core.toLowerCase()];
  if (mapped) {
    return `${lead}${mapped}${tail}`;
  }
  const lower = core.toLowerCase();
  const body = index === 0 ? capFirst(lower) : lower;
  return `${lead}${body}${tail}`;
}

function capFirst(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function cleanPrompt(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const prompt = value.replace(/\s+/g, ' ').trim();
  if (prompt.length < 24 || prompt.length > 200) {
    return '';
  }
  return prompt;
}

function slugIdea(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return slug ? `${slug}-${index}` : `idea-${index}`;
}

function shuffle<T>(items: T[], salt: string): T[] {
  const next = [...items];
  let state = hashSalt(salt);
  for (let i = next.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    next[i] = b;
    next[j] = a;
  }
  return next;
}

function hashSalt(salt: string): number {
  let h = 2166136261;
  for (let i = 0; i < salt.length; i += 1) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
