const PUBLIC_ORIGIN = 'https://vizzy.run';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || PUBLIC_ORIGIN).replace(/\/$/, '');
}

export function publicOrigin(): string {
  return PUBLIC_ORIGIN;
}

export const SITE_DESCRIPTION =
  'A chart you can paste. Type or speak what to chart, or ask your AI to. Bar, line, or scatter. You get a link and a PNG.';
