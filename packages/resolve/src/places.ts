import { foldAsked } from './normalize';

export function phraseIn(asked: string, phrase: string): boolean {
  const hay = foldAsked(asked);
  const needle = foldAsked(phrase);
  if (needle.length < 2) {
    return false;
  }
  const body = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${body}(?![a-z0-9])`).test(hay);
}

const PLACES: ReadonlyArray<{ entity: string; names: readonly string[] }> = [
  { entity: 'United States', names: ['united states', 'u.s.', 'usa', 'us'] },
  { entity: 'China', names: ['china'] },
  { entity: 'India', names: ['india'] },
];

export function placesInAsked(asked: string): string[] {
  return PLACES.filter((place) => place.names.some((name) => phraseIn(asked, name))).map(
    (place) => place.entity
  );
}
