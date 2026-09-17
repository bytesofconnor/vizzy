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
