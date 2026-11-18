export const USAGE_TEAM_ID = 'team_ynn7qy4sDXJcDEMHSuWLuXXo';
export const USAGE_TOKEN_ENV = 'VERCEL_USAGE_TOKEN';

export type UsageGroup = { key: string; count: number; costUsd: number };

export type UsageWindow = {
  days: 7 | 30;
  byModel: UsageGroup[];
  byStatus: UsageGroup[];
  requestCount: number;
  costUsd: number;
  errorRate: number;
  forbidden: number;
  notFound: number;
};

type QueryResult = { ok: true; body: unknown } | { ok: false; status: number; message: string };

const listKeys = ['data', 'rows', 'summary', 'results'] as const;

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function statusFlags(byStatus: UsageGroup[]): Pick<
  UsageWindow,
  'requestCount' | 'costUsd' | 'errorRate' | 'forbidden' | 'notFound'
> {
  const requestCount = byStatus.reduce((sum, row) => sum + row.count, 0);
  const errors = byStatus
    .filter((row) => row.key !== '200' && row.key !== '0')
    .reduce((sum, row) => sum + row.count, 0);
  return {
    requestCount,
    costUsd: byStatus.reduce((sum, row) => sum + row.costUsd, 0),
    errorRate: requestCount > 0 ? errors / requestCount : 0,
    forbidden: byStatus.find((row) => row.key === '403')?.count ?? 0,
    notFound: byStatus.find((row) => row.key === '404')?.count ?? 0,
  };
}

export function usageNeedsAttention(window: UsageWindow, trackedNotFound: number, trackedForbidden: number): boolean {
  return window.errorRate > 0 || window.forbidden > 0 || window.notFound > 0 || trackedNotFound > 0 || trackedForbidden > 0;
}

function objectField(row: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = row[key];
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function parseUsageGroups(body: unknown, dimension: string): UsageGroup[] {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const record = body as Record<string, unknown>;
  const list = listKeys.map((key) => record[key]).find(Array.isArray) as unknown[] | undefined;
  if (!list) {
    return [];
  }
  const groups: UsageGroup[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const dimensions = objectField(row, 'dimensions') ?? objectField(row, 'group') ?? row;
    const key = dimensions[dimension];
    if (typeof key !== 'string' && typeof key !== 'number') {
      continue;
    }
    const values = objectField(row, 'values') ?? row;
    groups.push({
      key: String(key),
      count: numeric(values.requests ?? values.count ?? values.value ?? values.sum) ?? 0,
      costUsd: numeric(values.spend ?? values.cost ?? values.costUsd) ?? 0,
    });
  }
  return groups.sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

async function queryUsage(
  token: string,
  groupBy: 'aiModel' | 'httpStatus',
  startTime: string,
  endTime: string
): Promise<QueryResult> {
  const response = await fetch(`https://api.vercel.com/metrics/v1?teamId=${USAGE_TEAM_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scope: { ownerId: USAGE_TEAM_ID },
      timeRange: { start: startTime, end: endTime },
      groupBy: [groupBy],
      metrics: {
        requests: { metric: 'vercel.ai_gateway.request.count', aggregation: 'count' },
        spend: { metric: 'vercel.ai_gateway.request.cost', aggregation: 'sum' },
      },
      outputs: ['requests', 'spend'],
      rowLimit: 50,
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    return { ok: false, status: response.status, message: `AI Gateway usage ${response.status}` };
  }
  return { ok: true, body: await response.json() };
}

export async function loadUsageWindow(
  token: string,
  days: 7 | 30,
  now = Date.now()
): Promise<{ window?: UsageWindow; error?: string }> {
  const endTime = new Date(now).toISOString();
  const startTime = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const [models, statuses] = await Promise.all([
    queryUsage(token, 'aiModel', startTime, endTime),
    queryUsage(token, 'httpStatus', startTime, endTime),
  ]);
  const failed = [models, statuses].find((result) => !result.ok);
  if (failed && !failed.ok) {
    return { error: failed.message };
  }
  if (!models.ok || !statuses.ok) {
    return { error: 'AI Gateway usage was empty' };
  }
  const byModel = parseUsageGroups(models.body, 'aiModel');
  const byStatus = parseUsageGroups(statuses.body, 'httpStatus');
  const flags = statusFlags(byStatus);
  const costUsd = byModel.reduce((sum, row) => sum + row.costUsd, 0);
  return {
    window: {
      days,
      byModel,
      byStatus,
      ...flags,
      costUsd: costUsd || flags.costUsd,
    },
  };
}
