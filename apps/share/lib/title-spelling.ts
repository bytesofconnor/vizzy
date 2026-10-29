export function chartDrawnWords(
  labels: readonly string[],
  rows: readonly object[]
): string[] {
  return [
    ...labels,
    ...rows.flatMap(row => [cell(row, 'x'), cell(row, 'series')]),
  ];
}

function cell(row: object, key: string): string {
  if (!(key in row)) {
    return '';
  }
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

type ResolvedWords = {
  drawn: readonly string[];
  also?: readonly string[];
};

export function spellTitleFromResolved(
  title: string,
  resolved: ResolvedWords
): string {
  const drawn = wordIndex(resolved.drawn);
  const also = wordIndex(resolved.also ?? []);
  if (drawn.size === 0 && also.size === 0) {
    return title;
  }
  return title.replace(words(), token => {
    if ([...token].length < 5) {
      return token;
    }
    const key = token.toLowerCase();
    const fromDrawn = correction(key, drawn);
    if (fromDrawn === 'keep') {
      return token;
    }
    if (fromDrawn) {
      return restyle(token, fromDrawn);
    }
    const fromAlso = correction(key, also);
    if (!fromAlso || fromAlso === 'keep') {
      return token;
    }
    return restyle(token, fromAlso);
  });
}

function words(): RegExp {
  return /[\p{L}][\p{L}'’-]*/gu;
}

function wordIndex(parts: readonly string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const part of parts) {
    for (const word of part.match(words()) ?? []) {
      if ([...word].length < 5) {
        continue;
      }
      const key = word.toLowerCase();
      const previous = index.get(key);
      if (
        !previous ||
        (previous === previous.toLowerCase() && word !== word.toLowerCase())
      ) {
        index.set(key, word);
      }
    }
  }
  return index;
}

function correction(
  key: string,
  index: Map<string, string>
): string | 'keep' | undefined {
  if (index.has(key)) {
    return 'keep';
  }
  const hits: string[] = [];
  for (const [folded, display] of index) {
    if (inflection(key, folded) || !oneEdit(key, folded)) {
      continue;
    }
    hits.push(display);
  }
  return hits.length === 1 ? hits[0] : undefined;
}

function inflection(left: string, right: string): boolean {
  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];
  if (longer === `${shorter}s` || longer === `${shorter}es`) {
    return true;
  }
  return shorter.endsWith('y') && longer === `${shorter.slice(0, -1)}ies`;
}

function oneEdit(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) {
    return false;
  }
  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];
  let index = 0;
  while (index < shorter.length && shorter[index] === longer[index]) {
    index += 1;
  }
  if (shorter.length === longer.length) {
    const swap =
      index + 1 < shorter.length &&
      shorter[index] === longer[index + 1] &&
      shorter[index + 1] === longer[index];
    const rest = swap ? index + 2 : index + 1;
    return shorter.slice(rest) === longer.slice(rest);
  }
  return shorter.slice(index) === longer.slice(index + 1);
}

function restyle(token: string, resolved: string): string {
  if ([...token].length > 1 && token === token.toUpperCase()) {
    return resolved.toUpperCase();
  }
  if (token[0] === token[0]?.toUpperCase()) {
    if (resolved[0] === resolved[0]?.toUpperCase()) {
      return resolved;
    }
    return `${resolved.charAt(0).toUpperCase()}${resolved.slice(1)}`;
  }
  return resolved.toLowerCase();
}
