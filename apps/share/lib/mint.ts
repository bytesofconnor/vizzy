import {
  suggestChart,
  validateChartRequest,
  type DataPoint,
  type Source,
  type ValidationIssue,
} from '@vizzy/core';
import { decodePortableDraft, encodePortableDraft, type PortableDraft } from './portable';
import type { Piece } from './pieces';
import { cleanSourceLabel } from './source';
import { DUST, studioChart } from './theme';

const MAX_ROWS = 80;

export interface MintInput {
  kicker?: string;
  title?: string;
  note?: string;
  config?: unknown;
  data?: unknown;
  source?: unknown;
}

export type MintResult =
  | { ok: true; token: string; piece: Piece }
  | { ok: false; error: string; issues: ValidationIssue[] };

export function hydrateToken(token: string): Piece | null {
  const draft = decodePortableDraft(token);
  if (!draft) {
    return null;
  }
  return pieceFromDraft(draft, token);
}

export function mintPiece(input: MintInput): MintResult {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return { ok: false, error: 'title is required', issues: [] };
  }

  const data = Array.isArray(input.data) ? input.data : null;
  if (!data || data.length === 0) {
    return { ok: false, error: 'data must be a non-empty array of rows', issues: [] };
  }
  if (data.length > MAX_ROWS) {
    return {
      ok: false,
      error: `data is capped at ${MAX_ROWS} rows`,
      issues: [{ path: 'data', code: 'TOO_MANY_ROWS', message: `At most ${MAX_ROWS} rows` }],
    };
  }

  let config = input.config;
  if (config == null) {
    config = suggestChart(data, { title })[0]?.config;
  }

  const checked = validateChartRequest(config, data);
  if (!checked.valid || !checked.config) {
    return {
      ok: false,
      error: 'config does not fit the rows',
      issues: checked.issues,
    };
  }

  const source = resolveSource(input.source) ?? checked.config.source ?? {
    label: 'Unspecified',
    method: 'unknown' as const,
  };

  const extras: Record<string, unknown> = { source };
  if (input.config && typeof input.config === 'object' && input.config !== null && 'axes' in input.config) {
    extras.axes = (input.config as { axes?: unknown }).axes;
  }

  let studio = studioChart(checked.config.chart, checked.config.dataMapping, extras);
  let rows = data as DataPoint[];
  ({ config: studio, data: rows } = withDust(studio, rows));

  const draft: PortableDraft = {
    kicker: cleanText(input.kicker, 80) || 'Chart',
    title: cleanText(title, 160),
    note: cleanText(input.note, 280),
    chart: studio.chart,
    mapping: studio.dataMapping,
    source: studio.source,
    data: rows,
  };

  if (
    studio.axes.x.label ||
    studio.axes.y.label ||
    studio.axes.y.domain ||
    studio.axes.y.tickCount !== 3
  ) {
    draft.axes = studio.axes;
  }

  const token = encodePortableDraft(draft);
  return { ok: true, token, piece: pieceFromDraft(draft, token) };
}

function pieceFromDraft(draft: PortableDraft, token: string): Piece {
  const extras: Record<string, unknown> = {};
  if (draft.source) {
    extras.source = draft.source;
  }
  if (draft.axes) {
    extras.axes = draft.axes;
  }

  return {
    slug: `x/${token}`,
    kicker: draft.kicker,
    title: draft.title,
    note: draft.note,
    config: studioChart(draft.chart, draft.mapping, extras),
    data: draft.data,
  };
}

function withDust(
  config: Piece['config'],
  data: DataPoint[]
): { config: Piece['config']; data: DataPoint[] } {
  if (config.chart.type === 'line' || config.dataMapping.color) {
    return { config, data };
  }

  const rows = data.map((row, index) => ({
    ...row,
    tone: DUST[index % DUST.length],
  }));

  return {
    config: studioChart(config.chart, { ...config.dataMapping, color: 'tone' }, {
      source: config.source,
      axes: config.axes,
    }),
    data: rows,
  };
}

function resolveSource(value: unknown): Source | undefined {
  if (typeof value !== 'object' || value === null || !('label' in value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.label !== 'string' || raw.label.trim() === '') {
    return undefined;
  }

  const methods = ['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown'] as const;
  const method = methods.find((item) => item === raw.method) ?? 'unknown';
  const source: Source = {
    label: cleanSourceLabel(raw.label).slice(0, 120),
    method,
  };
  if (typeof raw.url === 'string' && /^https?:\/\//.test(raw.url)) {
    source.url = raw.url;
  }
  if (typeof raw.retrieved === 'string') {
    source.retrieved = raw.retrieved.slice(0, 32);
  }
  if (typeof raw.evidence === 'string') {
    source.evidence = raw.evidence.slice(0, 160);
  }
  return source;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, max);
}
