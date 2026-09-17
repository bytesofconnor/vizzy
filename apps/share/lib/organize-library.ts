import type { AccountChartRow } from './account-chart';

export type LibraryCluster = {
  title: string;
  latest: AccountChartRow;
  versions: AccountChartRow[];
};

export type LibraryBucket = {
  label: string;
  clusters: LibraryCluster[];
};

export function uniqueBySlug(rows: AccountChartRow[]): AccountChartRow[] {
  const seen = new Set<string>();
  const unique: AccountChartRow[] = [];
  for (const row of rows) {
    if (seen.has(row.slug)) {
      continue;
    }
    seen.add(row.slug);
    unique.push(row);
  }
  return unique;
}

export function clusterByTitle(rows: AccountChartRow[]): LibraryCluster[] {
  const groups = new Map<string, AccountChartRow[]>();
  const order: string[] = [];
  for (const row of uniqueBySlug(rows)) {
    const key = row.title.trim().toLowerCase() || 'chart';
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
      continue;
    }
    groups.set(key, [row]);
    order.push(key);
  }
  return order.map((key) => {
    const versions = (groups.get(key) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const latest = versions[0]!;
    return {
      title: latest.title,
      latest,
      versions,
    };
  });
}

export function organizeSaved(
  rows: AccountChartRow[],
  now = Date.now(),
  by: 'date' | 'route' = 'date'
): Array<{ label: string; rows: AccountChartRow[] }> {
  const unique = uniqueBySlug(rows).sort((a, b) => b.createdAt - a.createdAt);
  if (by === 'route') {
    const groups = [
      { label: 'You typed', rows: unique.filter((row) => row.route === 'compose') },
      { label: 'An agent', rows: unique.filter((row) => row.route === 'publish') },
    ];
    return groups.filter((group) => group.rows.length > 0);
  }
  const buckets = new Map<string, AccountChartRow[]>();
  const order: string[] = [];
  for (const row of unique) {
    const label = bucketLabel(row.createdAt, now);
    const existing = buckets.get(label);
    if (existing) {
      existing.push(row);
      continue;
    }
    buckets.set(label, [row]);
    order.push(label);
  }
  return order.map((label) => ({
    label,
    rows: buckets.get(label) ?? [],
  }));
}

export function organizeLibrary(rows: AccountChartRow[], now = Date.now()): LibraryBucket[] {
  const clusters = clusterByTitle(rows).sort((a, b) => b.latest.createdAt - a.latest.createdAt);
  const buckets = new Map<string, LibraryCluster[]>();
  const order: string[] = [];
  for (const cluster of clusters) {
    const label = bucketLabel(cluster.latest.createdAt, now);
    const existing = buckets.get(label);
    if (existing) {
      existing.push(cluster);
      continue;
    }
    buckets.set(label, [cluster]);
    order.push(label);
  }
  return order.map((label) => ({
    label,
    clusters: buckets.get(label) ?? [],
  }));
}

export function bucketLabel(createdAt: number, now = Date.now()): string {
  const day = utcDay(createdAt);
  const today = utcDay(now);
  if (day === today) {
    return 'Today';
  }
  if (day === utcDay(now - 24 * 60 * 60 * 1000)) {
    return 'Yesterday';
  }
  const weekAgo = utcDay(now - 6 * 24 * 60 * 60 * 1000);
  if (day >= weekAgo) {
    return 'This week';
  }
  const thisMonth = today.slice(0, 7);
  if (day.slice(0, 7) === thisMonth) {
    return 'This month';
  }
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function routeLabel(route: AccountChartRow['route']): string {
  return route === 'publish' ? 'An agent' : 'You typed';
}

export function formatLibraryWhen(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
