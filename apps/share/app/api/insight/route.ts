import { chartInsightForSeed, chartLessonForSeed } from '../../../lib/chart-insight';
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
    const lesson = await chartLessonForSeed(seed, already);
    if (!lesson) {
      return Response.json({ ok: false, error: 'Could not go deeper right now' }, { status: 503 });
    }
    return Response.json({ ok: true, lesson });
  }

  const insight = await chartInsightForSeed(seed);
  if (!insight) {
    return Response.json({ ok: false, error: 'Could not generate insight right now' }, { status: 503 });
  }

  return Response.json({ ok: true, insight });
}
