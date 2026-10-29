export function foldAsked(asked: string): string {
  return asked
    .toLowerCase()
    .replace(/[₂]/g, '2')
    .replace(/[₄]/g, '4')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function sinceYearFromAsked(asked: string): number | undefined {
  const match = foldAsked(asked).match(/\bsince (\d{4})\b/);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  if (year < 1800 || year > 2100) {
    return undefined;
  }
  return year;
}

export function yearSpanFromAsked(asked: string, now = Date.now()): { since?: number; until?: number } {
  const folded = foldAsked(asked);
  const range = folded.match(
    /\b((?:1[89]|20)\d{2})\s*(?:-|–|—|to|through)\s*((?:1[89]|20)\d{2})\b/
  );
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    const since = Math.min(start, end);
    const until = Math.max(start, end);
    if (since >= 1800 && until <= 2100) {
      return { since, until };
    }
  }
  const since = sinceYearFromAsked(asked);
  if (since !== undefined) {
    return { since };
  }
  const relative = folded.match(/\b(?:last|past)\s+(\d{1,2})\s+years?\b/);
  if (relative) {
    const count = Number(relative[1]);
    if (count >= 1 && count <= 80) {
      return { since: new Date(now).getUTCFullYear() - count };
    }
  }
  return {};
}

export function yearOfX(x: string): number | undefined {
  const match = String(x).match(/^(-?\d{1,6})/);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < -20000 || year > 2100) {
    return undefined;
  }
  return year;
}

export function parseNumber(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').replace(/~/, '').match(/-?\d+(?:\.\d+)?/);
  if (!cleaned) {
    return undefined;
  }
  const n = Number(cleaned[0]);
  return Number.isFinite(n) ? n : undefined;
}
