type ResolvedRow = { x: string | number; series?: string };

/** Function words and one-edit pairs such as lost/loss stay as written. */
const EXACT = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'in',
  'on',
  'for',
  'to',
  'by',
  'vs',
  'per',
  'or',
  'year',
  'years',
  'month',
  'months',
  'day',
  'days',
  'country',
  'countries',
  'value',
  'rate',
  'rates',
  'share',
  'shares',
  'percent',
  'percentage',
  'number',
  'count',
  'total',
  'change',
  'name',
  'category',
  'series',
  'annual',
  'data',
  'world',
  'our',
  'sea',
  'ice',
  'lost',
  'loss',
  'area',
  'mean',
  'new',
  'from',
  'with',
  'that',
  'this',
  'into',
  'over',
  'under',
  'than',
  'then',
  'since',
  'ha',
  'km',
  'ppm',
  'million',
]);

const WORD = /[\p{L}\p{N}][\p{L}\p{N}’']*/gu;

type Tok = { text: string; start: number; end: number };

function fold(text: string): string {
  return text.toLowerCase().replace(/₂/g, '2').replace(/₄/g, '4').replace(/[’']/g, "'");
}

function tokenize(text: string): Tok[] {
  const tokens: Tok[] = [];
  for (const match of text.matchAll(WORD)) {
    const word = match[0];
    const start = match.index ?? 0;
    tokens.push({ text: word, start, end: start + word.length });
  }
  return tokens;
}

function isTimeName(value: string): boolean {
  const text = value.trim();
  if (/^(?:19|20)\d{2}$/.test(text)) {
    return true;
  }
  if (/^(?:19|20)\d{2}[-/.]/.test(text)) {
    return true;
  }
  return /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
    text
  );
}

function damerau(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) {
    grid[i]![0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    grid[0]![j] = j;
  }
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      let next = Math.min(grid[i - 1]![j]! + 1, grid[i]![j - 1]! + 1, grid[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        next = Math.min(next, grid[i - 2]![j - 2]! + 1);
      }
      grid[i]![j] = next;
    }
  }
  return grid[left.length]![right.length]!;
}

function budget(length: number): number {
  if (length >= 9) {
    return 2;
  }
  if (length >= 3) {
    return 1;
  }
  return 0;
}

function tokenDistance(titleWord: string, canonical: string): number | null {
  const left = fold(titleWord);
  const right = fold(canonical);
  if (left === right) {
    return 0;
  }
  if (/\d/.test(left) || /\d/.test(right)) {
    return null;
  }
  if (!left[0] || left[0] !== right[0]) {
    return null;
  }
  if (EXACT.has(right)) {
    return null;
  }
  const room = budget(right.length);
  if (room === 0) {
    return null;
  }
  const distance = damerau(left, right);
  return distance <= room ? distance : null;
}

function phraseDistance(window: Tok[], phrase: string): number | null {
  const parts = tokenize(phrase);
  if (parts.length !== window.length || parts.length === 0) {
    return null;
  }
  let sum = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const distance = tokenDistance(window[index]!.text, parts[index]!.text);
    if (distance === null) {
      return null;
    }
    sum += distance;
  }
  return sum;
}

function prefer(current: string, next: string): string {
  const currentCap = /\p{Lu}/u.test(current);
  const nextCap = /\p{Lu}/u.test(next);
  if (currentCap !== nextCap) {
    return currentCap ? current : next;
  }
  return current;
}

function consider(pool: Map<string, string>, phrase: string) {
  const cleaned = phrase.trim().replace(/\s+/g, ' ');
  const parts = tokenize(cleaned);
  if (parts.length === 0 || !parts.some((part) => /\p{L}/u.test(part.text))) {
    return;
  }
  const key = parts.map((part) => fold(part.text)).join(' ');
  const previous = pool.get(key);
  pool.set(key, previous ? prefer(previous, cleaned) : cleaned);
}

function addRowName(pool: Map<string, string>, value: string) {
  const text = value.trim();
  if (!text || isTimeName(text)) {
    return;
  }
  consider(pool, text);
}

function addLabel(pool: Map<string, string>, label: string) {
  const tokens = tokenize(label);
  let run: string[] = [];
  const flush = () => {
    if (run.length === 0) {
      return;
    }
    const long = run.some((word) => word.length >= 5);
    if (run.length >= 2 || long) {
      consider(pool, run.join(' '));
    }
    run = [];
  };
  for (const token of tokens) {
    const word = token.text;
    const capital = /^\p{Lu}/u.test(word);
    const plain = /^\p{L}/u.test(word) && !/\d/.test(word);
    if (capital && plain && !EXACT.has(fold(word))) {
      run.push(word);
    } else {
      flush();
    }
  }
  flush();
  for (const token of tokens) {
    const word = token.text;
    if (word.length < 5 || /\d/.test(word) || EXACT.has(fold(word)) || !/\p{L}/u.test(word)) {
      continue;
    }
    consider(pool, word);
  }
}

function phrasesFor(resolved: { rows: ResolvedRow[]; labels?: string[] }): string[] {
  const pool = new Map<string, string>();
  for (const row of resolved.rows) {
    if (row.series) {
      addRowName(pool, row.series);
    }
    addRowName(pool, String(row.x));
  }
  for (const label of resolved.labels ?? []) {
    addLabel(pool, label);
  }
  return [...pool.values()];
}

export function spellTitleFromResolved(
  title: string,
  resolved: { rows: ResolvedRow[]; labels?: string[] }
): string {
  const phrases = phrasesFor(resolved);
  const tokens = tokenize(title);
  if (phrases.length === 0 || tokens.length === 0) {
    return title;
  }
  const covered = tokens.map(() => false);
  const hits: Array<{ start: number; end: number; phrase: string }> = [];
  const maxWidth = Math.max(...phrases.map((phrase) => tokenize(phrase).length));
  for (let width = maxWidth; width >= 1; width -= 1) {
    const candidates = phrases.filter((phrase) => tokenize(phrase).length === width);
    if (candidates.length === 0) {
      continue;
    }
    for (let index = 0; index + width <= tokens.length; index += 1) {
      if (covered.slice(index, index + width).some(Boolean)) {
        continue;
      }
      const window = tokens.slice(index, index + width);
      let best: { phrase: string; distance: number } | null = null;
      let tied = false;
      for (const phrase of candidates) {
        const distance = phraseDistance(window, phrase);
        if (distance === null) {
          continue;
        }
        if (!best || distance < best.distance) {
          best = { phrase, distance };
          tied = false;
        } else if (distance === best.distance && fold(phrase) !== fold(best.phrase)) {
          tied = true;
        }
      }
      if (!best || best.distance === 0 || tied) {
        continue;
      }
      const first = tokens[index]!;
      const last = tokens[index + width - 1]!;
      hits.push({ start: first.start, end: last.end, phrase: best.phrase });
      for (let mark = index; mark < index + width; mark += 1) {
        covered[mark] = true;
      }
    }
  }
  let next = title;
  for (const hit of hits.sort((left, right) => right.start - left.start)) {
    next = `${next.slice(0, hit.start)}${hit.phrase}${next.slice(hit.end)}`;
  }
  return next;
}
