const PUBLIC_ORIGIN = 'https://vizzy.run';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || PUBLIC_ORIGIN).replace(/\/$/, '');
}

export function publicOrigin(): string {
  return PUBLIC_ORIGIN;
}

export const SITE_DESCRIPTION =
  'Turn a question into a publish-ready chart. AI drafts the series; you get a link and PNG. Source optional, shown on the chart when you have one.';
