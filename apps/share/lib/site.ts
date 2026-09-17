const PUBLIC_ORIGIN = 'https://vizzy.run';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || PUBLIC_ORIGIN).replace(/\/$/, '');
}

export function publicOrigin(): string {
  return PUBLIC_ORIGIN;
}

export const SITE_DESCRIPTION =
  'A chart you can paste. Ask a public question. Get the picture, the source, and a short explanation.';
