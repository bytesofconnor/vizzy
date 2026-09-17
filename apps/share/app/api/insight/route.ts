import {
  chartInsightForSeed,
  chartLessonForSeed,
  MAX_LESSON_LAYERS,
  type LessonPrior,
} from '../../../lib/chart-insight';
import { parseChartSeed, type ChartSeed } from '../../../lib/seed';

function parseInsightSeed(value: unknown): ChartSeed | undefined {
  const seed = parseChartSeed(value);
  if (seed) {
    return seed;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== 'string' || !Array.isArray(raw.rows) || raw.rows.length === 0) {
    return undefined;
  }
  if (raw.chartType !== 'bar' && raw.chartType !== 'line' && raw.chartType !== 'scatter') {
    return undefined;
  }
  const rows: ChartSeed['rows'] = [];
  for (const row of raw.rows) {
    if (typeof row !== 'object' || row === null || !('x' in row) || !('y' in row)) {
      continue;
    }
    const y = Number((row as { y: unknown }).y);
    const x = (row as { x: unknown }).x;
    if (!Number.isFinite(y) || (typeof x !== 'string' && typeof x !== 'number')) {
      continue;
    }
    rows.push({ x, y });
  }
  if (rows.length === 0) {
    return undefined;
  }
  return {
    title: raw.title.slice(0, 160),
    kicker: typeof raw.kicker === 'string' ? raw.kicker.slice(0, 80) : 'Chart',
    note: typeof raw.note === 'string' ? raw.note.slice(0, 280) : '',
    chartType: raw.chartType,
    area: raw.area === true,
    xLabel: typeof raw.xLabel === 'string' ? raw.xLabel.slice(0, 40) : 'Category',
    yLabel: typeof raw.yLabel === 'string' ? raw.yLabel.slice(0, 40) : 'Value',
    sourceLabel: typeof raw.sourceLabel === 'string' ? raw.sourceLabel.slice(0, 120) : 'Unspecified',
    sourceMethod: 'unknown',
    evidence: typeof raw.evidence === 'string' ? raw.evidence.slice(0, 160) : '',
    rows: rows.slice(0, 24),
  };
}

function parsePrior(value: unknown): LessonPrior[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: LessonPrior[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.notice !== 'string' || typeof raw.question !== 'string') {
      continue;
    }
    out.push({
      notice: raw.notice.slice(0, 240),
      question: raw.question.slice(0, 280),
    });
  }
  return out.slice(0, MAX_LESSON_LAYERS);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const seed =
    typeof body === 'object' && body !== null && 'seed' in body
      ? parseInsightSeed((body as { seed: unknown }).seed)
      : undefined;

  if (!seed) {
    return Response.json({ ok: false, error: 'seed is required' }, { status: 400 });
  }

  const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (payload.depth === 'lesson') {
    const already = typeof payload.insight === 'string' ? payload.insight.slice(0, 900) : undefined;
    const layerRaw = typeof payload.layer === 'number' ? payload.layer : Number(payload.layer);
    const layer = Number.isFinite(layerRaw) ? layerRaw : 1;
    if (layer > MAX_LESSON_LAYERS) {
      return Response.json({ ok: false, error: 'That is as deep as this goes' }, { status: 400 });
    }
    const prior = parsePrior(payload.prior);
    const lesson = await chartLessonForSeed(seed, already, layer, prior);
    return Response.json({
      ok: true,
      lesson,
      layer: Math.min(MAX_LESSON_LAYERS, Math.max(1, Math.floor(layer))),
    });
  }

  const insight = await chartInsightForSeed(seed);
  return Response.json({ ok: true, insight });
}
