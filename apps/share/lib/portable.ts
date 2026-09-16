import { deflateSync, inflateSync } from 'zlib';
import type { DataPoint, Source } from '@vizzy/core';

export interface PortableDraft {
  kicker: string;
  title: string;
  note: string;
  chart: { type: 'bar' | 'line' | 'scatter' } & Record<string, unknown>;
  mapping: { x: string; y: string; color?: string; size?: string; group?: string };
  source?: Source;
  axes?: unknown;
  printGrayscale?: boolean;
  data: DataPoint[];
}

export function encodePortableDraft(draft: PortableDraft): string {
  return deflateSync(Buffer.from(JSON.stringify(draft), 'utf8')).toString('base64url');
}

export function decodePortableDraft(token: string): PortableDraft | null {
  try {
    const json = inflateSync(Buffer.from(token, 'base64url')).toString('utf8');
    const value: unknown = JSON.parse(json);
    if (!isDraft(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function isDraft(value: unknown): value is PortableDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const draft = value as Record<string, unknown>;
  const chart = draft.chart as { type?: unknown } | undefined;
  const mapping = draft.mapping as { x?: unknown; y?: unknown } | undefined;
  return (
    typeof draft.title === 'string' &&
    typeof draft.kicker === 'string' &&
    typeof draft.note === 'string' &&
    Array.isArray(draft.data) &&
    !!chart &&
    (chart.type === 'bar' || chart.type === 'line' || chart.type === 'scatter') &&
    !!mapping &&
    typeof mapping.x === 'string' &&
    typeof mapping.y === 'string'
  );
}
