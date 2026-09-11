import type { ChartConfig } from '@vizzy/core';

export type ChartSource = NonNullable<ChartConfig['source']>;

const GRADE: Record<ChartSource['method'], string> = {
  official: 'primary',
  export: 'direct',
  manual: 'direct',
  scraped: 'thin',
  estimate: 'estimate',
  example: 'example',
  unknown: 'unknown',
};

export function sourceLine(source: ChartSource): string {
  const parts = [source.label, GRADE[source.method]];
  if (source.retrieved) {
    parts.push(source.retrieved);
  }
  if (source.evidence) {
    parts.push(source.evidence);
  }
  return parts.join('  ·  ');
}
