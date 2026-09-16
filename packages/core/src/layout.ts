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

export type XTickRotate = 0 | -40 | -65;

export function compactAxisLabel(name: string): string {
  const trimmed = name.trim();
  const fiscal = trimmed.match(/^20(\d{2})\s*[-–/]\s*(?:(\d{2})|20(\d{2}))$/);
  if (fiscal) {
    const end = fiscal[3] ?? fiscal[2];
    return end ? `${fiscal[1]}/${end}` : trimmed;
  }
  if (/^20(\d{2})$/.test(trimmed)) {
    return trimmed.slice(2);
  }
  return trimmed;
}

export function xTickRotate(names: string[], innerWidth: number): XTickRotate {
  const labels = shortCategoryNames(names).map(compactAxisLabel);
  if (looksSequentialX(names)) {
    return 0;
  }
  if (labels.length < 4) {
    return 0;
  }
  const slot = innerWidth / Math.max(labels.length, 1);
  const items = labels.map((name, index) => ({
    x: (index + 0.5) * slot,
    width: Math.max(name.length * 6.6, 10),
  }));
  if (ticksFit(items, items.map(() => true))) {
    return 0;
  }
  return labels.length > 12 || labels.some((name) => name.length > 16) ? -65 : -40;
}

/** Last names when a crowded set is clearly people. Keeps every bar labeled. */
export function shortCategoryNames(names: string[]): string[] {
  if (looksSequentialX(names) || names.length < 10) {
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
  return 16 + longest * 6.2 * Math.sin(radians);
}

export function xAxisRoom(
  names: string[],
  options: { hasTitle?: boolean; innerWidth?: number } = {}
): { rotate: XTickRotate; tickDepth: number; titleY: number; bottom: number } {
  const innerWidth = options.innerWidth ?? 640;
  const hasTitle = Boolean(options.hasTitle);
  const labels = shortCategoryNames(names).map(compactAxisLabel);
  const rotate = xTickRotate(names, innerWidth);
  const longest = labels.reduce((max, name) => Math.max(max, name.length), 1);
  const wrapLines =
    rotate === 0 && labels.some((name) => name.includes(' ') && name.length * 7 > innerWidth / Math.max(labels.length, 1) + 10)
      ? longest > 22
        ? 3
        : 2
      : 1;
  const tickDepth = rotate ? rotatedTickDepth(longest, rotate) : 18 + wrapLines * 16;
  const titleY = tickDepth + (hasTitle ? 20 : 0);
  const bottom = titleY + (hasTitle ? 16 : 10);
  return { rotate, tickDepth, titleY, bottom };
}
