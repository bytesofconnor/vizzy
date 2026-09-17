import { matchPrompt, notesFromResolved, resolvePrompt, type ResolvedSeries } from '@vizzy/resolve';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

function serverSecret(): string | undefined {
  return process.env.COMPOSE_SERVER_SECRET;
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T | undefined> {
  const url = convexUrl();
  const secret = serverSecret();
  if (!url || !secret) {
    return undefined;
  }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, args: { secret, ...args }, format: 'json' }),
    });
    const body = (await response.json()) as ConvexResult<T>;
    if (body.status !== 'success') {
      return undefined;
    }
    return body.value;
  } catch {
    return undefined;
  }
}

async function record(
  outcome: 'hit' | 'miss' | 'error',
  extra: { family?: string; seriesId?: string; fromCache: boolean }
): Promise<void> {
  await convexCall('mutation', 'resolve:recordEvent', {
    outcome,
    family: extra.family,
    seriesId: extra.seriesId,
    fromCache: extra.fromCache,
  });
}

export async function gatherOfficialSeries(
  asked: string
): Promise<{ notes: string; urls: string[]; series: ResolvedSeries } | null> {
  const recipe = matchPrompt(asked);
  if (!recipe) {
    return null;
  }

  const now = Date.now();
  const cached = await convexCall<ResolvedSeries | null>('query', 'resolve:getCached', {
    family: recipe.family,
    seriesId: recipe.seriesId,
    now,
    maxAgeMs: DAY_MS,
  });
  if (cached && cached.rows.length >= 2) {
    await record('hit', { family: recipe.family, seriesId: recipe.seriesId, fromCache: true });
    return { notes: notesFromResolved(cached), urls: [cached.sourceUrl], series: cached };
  }

  try {
    const series = await resolvePrompt(asked, { now });
    if (!series) {
      await record('error', { family: recipe.family, seriesId: recipe.seriesId, fromCache: false });
      return null;
    }
    await convexCall('mutation', 'resolve:putCached', {
      family: series.family,
      seriesId: series.seriesId,
      sourceLabel: series.sourceLabel,
      sourceUrl: series.sourceUrl,
      retrieved: series.retrieved,
      xLabel: series.xLabel,
      yLabel: series.yLabel,
      rows: series.rows,
    });
    await record('hit', { family: series.family, seriesId: series.seriesId, fromCache: false });
    return { notes: notesFromResolved(series), urls: [series.sourceUrl], series };
  } catch {
    await record('error', { family: recipe.family, seriesId: recipe.seriesId, fromCache: false });
    return null;
  }
}
