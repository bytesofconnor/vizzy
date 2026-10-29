/** Time-like axes can skip ticks. Named categories cannot. */

const NAME_PARTICLE = /^(van|von|de|da|del|di|la|le|el|al|bin|ibn|st\.?)$/i;

export function looksSequentialX(names: string[]): boolean {
  if (names.length < 4) {
    return false;
  }
  const hits = names.filter((name) => {
    const n = name.trim();
    return (
      /^20\d{2}(?:\s*[-–/]\s*(?:\d{2}|20\d{2}))?$/.test(n) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(n) ||
      /^w(?:eek)?\s*\d+$/i.test(n) ||
      /^\d{4}$/.test(n)
    );
  }).length;
  return hits >= names.length * 0.7;
}

export function ticksFit(
  items: Array<{ x: number; width: number }>,
  keep: boolean[]
): boolean {
  const shown = items.filter((_, index) => keep[index]);
  for (let i = 1; i < shown.length; i += 1) {
    const prev = shown[i - 1]!;
    const next = shown[i]!;
    if (next.x - prev.x < prev.width / 2 + next.width / 2 + 12) {
      return false;
    }
  }
  return true;
}

export type XTickRotate = 0 | -40 | -65 | -90;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LABEL_PX = 6.6;

const MONTH_WORD: Array<[RegExp, string]> = [
  [/^january\b/i, 'Jan'],
  [/^february\b/i, 'Feb'],
  [/^march\b/i, 'Mar'],
  [/^april\b/i, 'Apr'],
  [/^may\b/i, 'May'],
  [/^june\b/i, 'Jun'],
  [/^july\b/i, 'Jul'],
  [/^august\b/i, 'Aug'],
  [/^september\b/i, 'Sep'],
  [/^october\b/i, 'Oct'],
  [/^november\b/i, 'Nov'],
  [/^december\b/i, 'Dec'],
  [/^sept\b/i, 'Sep'],
  [/^jan\b/i, 'Jan'],
  [/^feb\b/i, 'Feb'],
  [/^mar\b/i, 'Mar'],
  [/^apr\b/i, 'Apr'],
  [/^jun\b/i, 'Jun'],
  [/^jul\b/i, 'Jul'],
  [/^aug\b/i, 'Aug'],
  [/^sep\b/i, 'Sep'],
  [/^oct\b/i, 'Oct'],
  [/^nov\b/i, 'Nov'],
  [/^dec\b/i, 'Dec'],
];

const MONTH_TOKEN =
  /^(january|february|march|april|may|june|july|august|september|october|november|december|sept|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i;

function monthAbbrev(name: string): string | null {
  const trimmed = name.trim();
  for (const [pattern, abbrev] of MONTH_WORD) {
    if (pattern.test(trimmed)) {
      return abbrev;
    }
  }
  return null;
}

function shortMonthLabel(name: string): string | null {
  const abbrev = monthAbbrev(name);
  if (!abbrev) {
    return null;
  }
  const rest = name.trim().replace(MONTH_TOKEN, '').trim();
  return rest ? `${abbrev} ${rest}` : abbrev;
}

export function monthCycleShortLabels(names: string[]): string[] | null {
  if (names.length !== 12) {
    return null;
  }
  const short = names.map(shortMonthLabel);
  if (short.some((label) => label == null)) {
    return null;
  }
  if (new Set(names.map(monthAbbrev)).size !== 12) {
    return null;
  }
  return short as string[];
}

export function compactAxisLabel(name: string): string {
  const trimmed = name.trim();
  const month = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const label = MONTHS[Number(month[2]) - 1];
    if (label) {
      return `${label} ${month[1]}`;
    }
  }
  return trimmed;
}

export function wrapCategoryLines(name: string, maxChars: number): string[] {
  const limit = Math.max(4, maxChars);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [name];
  }

  const joined = words.join(' ');
  const target = words.length >= 3
    ? Math.min(limit, Math.max(12, Math.ceil(joined.length * 0.55)))
    : limit;

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= target) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 3);
}

export function categoryLabelBox(name: string, slot: number): { lines: number; width: number } {
  const maxChars = Math.max(6, Math.floor(slot / 7));
  const lines = wrapCategoryLines(name, maxChars);
  const width = Math.max(...lines.map((line) => Math.max(line.length * 6.6, 10)), 10);
  return { lines: lines.length, width };
}

function longestLabel(labels: string[]): string {
  return labels.reduce((best, name) => (name.length > best.length ? name : best), '');
}

function labelFootprint(label: string, angle: XTickRotate): number {
  const length = Math.max(label.length * LABEL_PX, 10);
  if (angle === 0) {
    return length;
  }
  const radians = (Math.abs(angle) * Math.PI) / 180;
  return length * Math.cos(radians) + 14 * Math.sin(radians);
}

export function xTickRotate(names: string[], innerWidth: number): XTickRotate {
  const labels = displayNames(names);
  if (looksSequentialX(names) || labels.length === 0) {
    return 0;
  }
  const slot = innerWidth / Math.max(labels.length, 1);
  const wrapped = labels.map((name) => categoryLabelBox(name, slot));
  const items = wrapped.map((box, index) => ({
    x: (index + 0.5) * slot,
    width: box.width,
  }));
  if (ticksFit(items, items.map(() => true)) && wrapped.every((box) => box.lines <= 3 && box.width <= slot)) {
    return 0;
  }
  const longest = longestLabel(labels);
  for (const angle of [-40, -65, -90] as const) {
    if (labelFootprint(longest, angle) <= slot) {
      return angle;
    }
  }
  return -90;
}

export function barsReadHorizontally(names: string[], innerWidth: number): boolean {
  if (names.length < 8 || looksSequentialX(names)) {
    return false;
  }
  const labels = displayNames(names);
  const slot = innerWidth / Math.max(labels.length, 1);
  return labelFootprint(longestLabel(labels), -90) > slot;
}

function displayNames(names: string[]): string[] {
  return shortCategoryNames(names).map(compactAxisLabel);
}

const PLACE_START =
  /^(?:united|new|san|santa|são|sao|north|south|east|west|great|saint|st\.?|republic|democratic|central|burkina|papua|sri|costa|sierra|el|la|los|las|saudi|czech|dominican|bosnia|trinidad|antigua|isle|cape|hong|puerto|british|french|equatorial|northern|southern|western|eastern)$/i;

const PLACE_PHRASE = /\b(?:of|islands?|republic|states|kingdom|territor(?:y|ies)|province|county)\b/i;

function looksLikePeople(names: string[]): boolean {
  const multi = names.filter((name) => name.trim().split(/\s+/).filter(Boolean).length >= 2);
  if (multi.length < Math.ceil(names.length * 0.6)) {
    return false;
  }
  return !names.some((name) => {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return PLACE_START.test(first) || PLACE_PHRASE.test(name);
  });
}

/** Last names when a crowded set is clearly people. Places stay whole. */
export function shortCategoryNames(names: string[]): string[] {
  if (looksSequentialX(names) || names.length < 10 || !looksLikePeople(names)) {
    return names;
  }

  const lasts = names.map(personLast);
  const counts = new Map<string, number>();
  for (const last of lasts) {
    if (!last) {
      continue;
    }
    counts.set(last, (counts.get(last) ?? 0) + 1);
  }

  const labeled = names.map((name, index) => {
    const last = lasts[index];
    if (!last || (counts.get(last) ?? 0) !== 1) {
      return name;
    }
    return last;
  });

  return labeled.every((label, index) => label === names[index]) ? names : labeled;
}

function personLast(name: string): string | null {
  if (/\(.*\)/.test(name)) {
    return null;
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  const tail = parts[parts.length - 1]!;
  if (tail.length < 2 || /\d/.test(tail)) {
    return null;
  }
  const prior = parts[parts.length - 2]!;
  if (NAME_PARTICLE.test(prior)) {
    return `${prior} ${tail}`;
  }
  return tail;
}

export function rotatedTickDepth(longest: number, rotate: XTickRotate): number {
  if (rotate === 0) {
    return 0;
  }
  const radians = Math.abs(rotate) * (Math.PI / 180);
  return 24 + longest * 7.4 * Math.sin(radians) + 18;
}

export function xAxisRoom(
  names: string[],
  options: { hasTitle?: boolean; innerWidth?: number } = {}
): { rotate: XTickRotate; tickDepth: number; titleY: number; bottom: number } {
  const innerWidth = options.innerWidth ?? 640;
  const hasTitle = Boolean(options.hasTitle);
  const labels = shortCategoryNames(names).map(compactAxisLabel);
  const rotate = xTickRotate(names, innerWidth);
  const slot = innerWidth / Math.max(labels.length, 1);
  const longest = labels.reduce((max, name) => Math.max(max, name.length), 1);
  const wrapLines = rotate === 0
    ? Math.max(1, ...labels.map((name) => categoryLabelBox(name, slot).lines))
    : 1;
  const tickDepth = rotate ? rotatedTickDepth(longest, rotate) : 18 + wrapLines * 16;
  const titleY = tickDepth + (hasTitle ? 20 : 0);
  const bottom = titleY + (hasTitle ? 18 : 12);
  return { rotate, tickDepth, titleY, bottom };
}
