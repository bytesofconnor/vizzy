export type AttemptCount = {
  name: string;
  day: string;
  count: number;
};

export type RouteAttempts = {
  route: string;
  ok: number;
  failed: number;
  notFound: number;
  forbidden: number;
  rateLimit: number;
  schema: number;
  error: number;
};

const OUTCOMES = ['ok', 'not_found', 'forbidden', 'rate_limit', 'schema', 'error'] as const;

type Outcome = (typeof OUTCOMES)[number];

export function dayWindow(now: number, days: number): { fromDay: string; toDay: string } {
  const toDay = new Date(now).toISOString().slice(0, 10);
  const start = Date.parse(`${toDay}T00:00:00.000Z`) - (days - 1) * 24 * 60 * 60 * 1000;
  return { fromDay: new Date(start).toISOString().slice(0, 10), toDay };
}

export function parseModelAttempt(name: string): { route: string; outcome: Outcome } | null {
  const match = /^model_attempt:([^:]+):([^:]+):/.exec(name);
  if (!match) {
    return null;
  }
  const outcome = match[2];
  if (!outcome || !OUTCOMES.includes(outcome as Outcome)) {
    return null;
  }
  return { route: match[1] ?? '', outcome: outcome as Outcome };
}

function emptyRoute(route: string): RouteAttempts {
  return { route, ok: 0, failed: 0, notFound: 0, forbidden: 0, rateLimit: 0, schema: 0, error: 0 };
}

export function summarizeAttempts(rows: AttemptCount[], fromDay: string, toDay: string): RouteAttempts[] {
  const byRoute = new Map<string, RouteAttempts>();
  for (const row of rows) {
    if (row.day < fromDay || row.day > toDay || !Number.isFinite(row.count) || row.count <= 0) {
      continue;
    }
    const parsed = parseModelAttempt(row.name);
    if (!parsed) {
      continue;
    }
    const bucket = byRoute.get(parsed.route) ?? emptyRoute(parsed.route);
    if (parsed.outcome === 'ok') {
      bucket.ok += row.count;
    } else {
      bucket.failed += row.count;
      if (parsed.outcome === 'not_found') {
        bucket.notFound += row.count;
      } else if (parsed.outcome === 'forbidden') {
        bucket.forbidden += row.count;
      } else if (parsed.outcome === 'rate_limit') {
        bucket.rateLimit += row.count;
      } else if (parsed.outcome === 'schema') {
        bucket.schema += row.count;
      } else {
        bucket.error += row.count;
      }
    }
    byRoute.set(parsed.route, bucket);
  }
  return [...byRoute.values()].sort((a, b) => a.route.localeCompare(b.route));
}
