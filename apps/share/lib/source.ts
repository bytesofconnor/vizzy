import type { ChartConfig } from '@vizzy/core';

export type ChartSource = NonNullable<ChartConfig['source']>;

const GRADE: Record<ChartSource['method'], string> = {
  official: 'official',
  export: 'export',
  manual: 'entered',
  scraped: 'scraped',
  estimate: 'estimate',
  example: 'example',
  unknown: 'unknown',
};

export function sourceGrade(source: ChartSource): string {
  return GRADE[source.method];
}

export function sourceHost(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function sourceLabelFor(url: string | undefined, drafted: string): string {
  const cleaned = cleanSourceLabel(drafted);
  if (!url) {
    return cleaned;
  }
  const host = sourceHost(url);
  if (!host) {
    return cleaned;
  }
  if (host.includes('wikipedia.org')) {
    return 'Wikipedia';
  }
  const brand = host.split('.')[0] ?? '';
  if (brand && cleaned.toLowerCase().includes(brand.toLowerCase())) {
    return cleaned;
  }
  return host;
}

export function sourceMethodFor(
  url: string | undefined,
  method: ChartSource['method']
): ChartSource['method'] {
  if (!url) {
    return method;
  }
  if (url.includes('wikipedia.org') && method === 'official') {
    return 'scraped';
  }
  return method;
}

export function cleanSourceLabel(label: string): string {
  const stripped = label.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  return stripped || 'Source';
}

export function firstPromptUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!match) {
    return undefined;
  }
  const raw = match[0].replace(/[.,;:]+$/, '');
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function isInventedSource(source: ChartSource): boolean {
  return source.method === 'example' || source.method === 'estimate';
}

export function sourceLine(source: ChartSource): string {
  const parts = [source.label, GRADE[source.method]];
  const host = sourceHost(source.url);
  if (host) {
    parts.push(host);
  } else if (isInventedSource(source)) {
    parts.push('not a live source');
  }
  if (source.retrieved) {
    parts.push(source.retrieved);
  }
  if (source.evidence) {
    parts.push(source.evidence);
  }
  return parts.join('  ·  ');
}

/** Short line for the PNG. Host is the proof. Evidence lives on the page. */
export function sourceCardLine(source: ChartSource): string {
  const parts = [source.label, GRADE[source.method]];
  const host = sourceHost(source.url);
  if (host) {
    parts.push(host);
  } else if (isInventedSource(source)) {
    parts.push('not a live source');
  }
  return parts.join('  ·  ');
}
