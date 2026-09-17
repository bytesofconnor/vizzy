import { PROMPT_IDEAS, type PromptIdea } from './prompt-ideas';
import { DUST } from './theme';

export type HeroIdea = {
  id: string;
  label: string;
  prompt: string;
  tone: string;
};

export const HERO_IDEAS_STORAGE_KEY = 'vizzy.hero-ideas.v5';
export const HERO_IDEAS_SEEN_KEY = 'vizzy.hero-ideas-seen.v1';
export const HERO_IDEA_MIN = 8;
export const HERO_IDEA_MAX = 10;
export const HERO_SEEN_MAX = 80;

const HERO_TOPICS = new Set(['nature', 'earth', 'world', 'science', 'tech']);

export const DEFAULT_HERO_IDEAS: HeroIdea[] = fallbackFromIds([
  'sea-ice',
  'lithium',
  'launches',
  'dollar',
  'wildfire',
  'aging',
  'lng',
  'robots',
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
  const blocked = new Set(exclude.map((item) => item.trim().toLowerCase()).filter(Boolean));
  const pool = PROMPT_IDEAS.filter((idea) => HERO_TOPICS.has(idea.topic));
  const shuffled = shuffle(pool, salt);
  const unseen = shuffled.filter((idea) => !isBlocked(idea, blocked));
  const seen = shuffled.filter((idea) => isBlocked(idea, blocked));
  const picked = [...unseen, ...seen].slice(0, HERO_IDEA_MIN);
  return picked.map((idea, index) => toHeroIdea(idea, index));
}

export function mergeSeenPrompts(previous: readonly string[], batch: readonly HeroIdea[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const key = value.trim();
    if (key.length < 8) {
      return;
    }
    const folded = key.toLowerCase();
    if (seen.has(folded)) {
      return;
    }
    seen.add(folded);
    next.push(key);
  };
  for (const item of previous) {
    push(item);
  }
  for (const idea of batch) {
    push(idea.prompt);
    push(idea.label);
    push(idea.id);
  }
  return next.slice(-HERO_SEEN_MAX);
}

function isBlocked(idea: PromptIdea, blocked: ReadonlySet<string>): boolean {
  return (
    blocked.has(idea.id.toLowerCase()) ||
    blocked.has(idea.prompt.toLowerCase()) ||
    blocked.has(chipLabel(idea).toLowerCase())
  );
}

function toHeroIdea(idea: PromptIdea, index: number): HeroIdea {
  return {
    id: idea.id,
    label: chipLabel(idea),
    prompt: idea.prompt,
    tone: idea.tone || DUST[index % DUST.length],
  };
}

function fallbackFromIds(ids: readonly string[]): HeroIdea[] {
  return ids
    .map((id) => PROMPT_IDEAS.find((idea) => idea.id === id))
    .filter((idea): idea is PromptIdea => Boolean(idea))
    .map((idea, index) => toHeroIdea(idea, index));
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
    'sea-ice': 'When Arctic summer ice fell off',
    lithium: 'Who actually mines the lithium',
    'rare-earths': 'Who controls the rare earths',
    datacenters: 'How much power data centers eat',
    lng: 'Who ships the most LNG',
    gold: 'Who sits on the gold',
    passports: 'Which passports open the most doors',
    'youth-jobs': 'Where young people cannot find work',
    'housing-starts': 'Did US housing ever start again',
    aging: 'Which countries got old first',
    military: 'Who spends the most on arms',
    oil: 'Who still pumps the most oil',
    ev: 'Where new cars went electric',
    reactors: 'Who is still building reactors',
    wildfire: 'Are US fire seasons getting larger',
    warming: 'How much the planet actually warmed',
    treasuries: 'Who holds America’s treasuries',
    patents: 'Who files the patents now',
    remittances: 'Which countries live on remittances',
    grain: 'Who ships the world’s grain',
    water: 'Which countries are most water-stressed',
    launches: 'Who is launching the satellites',
    dollar: 'Is the dollar share slipping',
    robots: 'Where the robots actually work',
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
  lng: 'LNG',
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
