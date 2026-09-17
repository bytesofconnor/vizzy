import type { AccountChartRow, AccountLibraryKind, AccountLibraryPage } from './account-chart';
import { readWalletToken, walletTokenFromRequest } from './billing';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

function serverSecret(): string {
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!secret) {
    throw new Error('COMPOSE_SERVER_SECRET is not configured');
  }
  return secret;
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T> {
  const url = convexUrl();
  if (!url) {
    throw new Error('Convex is not configured');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: { secret: serverSecret(), ...args }, format: 'json' }),
  });
  const body = (await response.json()) as ConvexResult<T>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'Convex call failed');
  }
  return body.value;
}

export function utcDay(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function bumpEvent(name: string, day = utcDay()): Promise<void> {
  try {
    if (!convexUrl()) {
      return;
    }
    await convexCall('mutation', 'telemetry:bumpEvent', { name, day });
  } catch {
    // telemetry must not break user flows
  }
}

export async function logAiUsage(args: {
  route: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    if (!convexUrl()) {
      return;
    }
    await convexCall('mutation', 'telemetry:logAiCall', args);
  } catch {
    // telemetry must not break user flows
  }
}

export async function saveChartHistory(args: {
  walletToken: string;
  slug: string;
  title: string;
  route: 'compose' | 'publish';
}): Promise<void> {
  try {
    if (!convexUrl()) {
      return;
    }
    await convexCall('mutation', 'charts:save', args);
  } catch {
    // history must not break user flows
  }
}

export const LIBRARY_PAGE_SIZE = 24;

export async function listRecentCharts(
  walletToken: string,
  limit = 20
): Promise<AccountChartRow[]> {
  if (!convexUrl()) {
    return [];
  }
  return await convexCall('query', 'charts:listRecent', { walletToken, limit });
}

export async function listLibraryCharts(
  walletToken: string,
  args: {
    q?: string;
    kind?: AccountLibraryKind;
    cursor?: string | null;
    numItems?: number;
  } = {}
): Promise<AccountLibraryPage> {
  if (!convexUrl()) {
    return { page: [], isDone: true, continueCursor: '' };
  }
  return await convexCall('query', 'charts:listLibrary', {
    walletToken,
    q: args.q,
    kind: args.kind,
    paginationOpts: {
      numItems: Math.min(Math.max(args.numItems ?? LIBRARY_PAGE_SIZE, 1), 40),
      cursor: args.cursor ?? null,
    },
  });
}

export async function listPinnedCharts(
  walletToken: string,
  limit = 12
): Promise<AccountChartRow[]> {
  if (!convexUrl()) {
    return [];
  }
  return await convexCall('query', 'charts:listPinned', { walletToken, limit });
}

export async function chartIsPinned(walletToken: string, slug: string): Promise<boolean> {
  if (!convexUrl()) {
    return false;
  }
  return await convexCall('query', 'charts:isPinned', { walletToken, slug });
}

export async function setChartPinned(args: {
  walletToken: string;
  slug: string;
  pinned: boolean;
  title?: string;
  route?: 'compose' | 'publish';
}): Promise<{ pinned: boolean }> {
  if (!convexUrl()) {
    return { pinned: false };
  }
  return await convexCall('mutation', 'charts:setPinned', args);
}

export async function removeChartsFromHistory(
  walletToken: string,
  slugs: string[]
): Promise<{ removed: number }> {
  if (!convexUrl()) {
    return { removed: 0 };
  }
  return await convexCall('mutation', 'charts:removeFromHistory', { walletToken, slugs });
}

export type AdminInsights = {
  people: number;
  users: Array<{
    email: string;
    vias: Array<'google' | 'checkout'>;
    credits: number;
    owner: boolean;
    createdAt: number;
  }>;
  meterDraws: number;
  savedFromPrompt: number;
  savedFromPublish: number;
  purchases: number;
  taps: Array<{ label: string; count: number }>;
  aiCalls: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiByModel: Array<{
    model: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  recentAi: Array<{
    route: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    createdAt: number;
  }>;
  recentSaved: Array<{
    slug: string;
    title: string;
    route: 'compose' | 'publish';
    createdAt: number;
  }>;
};

export async function getAdminInsights(walletToken: string): Promise<AdminInsights | null> {
  if (!convexUrl()) {
    return null;
  }
  return await convexCall('query', 'telemetry:getInsights', {
    walletToken,
    now: Date.now(),
  });
}

export async function ownerSession(): Promise<boolean> {
  const token = await readWalletToken();
  if (!token) {
    return false;
  }
  const insights = await getAdminInsights(token);
  return insights !== null;
}

export async function recordAfterChart(args: {
  request?: Request;
  walletToken?: string;
  slug?: string;
  title: string;
  route: 'compose' | 'publish';
}): Promise<void> {
  const walletToken =
    args.walletToken ??
    (args.request ? await walletTokenFromRequest(args.request) : undefined);
  if (!walletToken || !args.slug) {
    return;
  }
  await saveChartHistory({
    walletToken,
    slug: args.slug,
    title: args.title,
    route: args.route,
  });
  await bumpEvent(`chart_${args.route}`);
}
