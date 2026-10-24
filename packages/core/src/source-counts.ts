import type { ChartConfig } from './types';

export function sourceWithholdsCounts(config: Pick<ChartConfig, 'source'>): boolean {
  const method = config.source?.method;
  return method === 'estimate' || method === 'example';
}
