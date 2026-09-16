import type { EvalPayload } from './payload';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

export async function publishPayload(payload: EvalPayload): Promise<void> {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!url || !secret) {
    throw new Error('CONVEX_URL and COMPOSE_SERVER_SECRET are required to publish');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'eval:recordRun',
      args: { secret, ...payload },
      format: 'json',
    }),
  });
  const body = (await response.json()) as ConvexResult<null>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'eval:record failed');
  }
}
