type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T> {
  const url = convexUrl();
  const secret = process.env.COMPOSE_SERVER_SECRET;
  if (!url || !secret) {
    throw new Error('Convex is not configured');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: { secret, ...args }, format: 'json' }),
  });
  const body = (await response.json()) as ConvexResult<T>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'Convex call failed');
  }
  return body.value;
}

export async function getLatestEval() {
  if (!convexUrl() || !process.env.COMPOSE_SERVER_SECRET) {
    return null;
  }
  try {
    return await convexCall<AdminEvalDto | null>('query', 'eval:latest', {});
  } catch {
    return null;
  }
}

export type AdminEvalDto = {
  runId: string;
  kind: string;
  models: string[];
  repeats: number;
  n: number;
  passed: number;
  rate: number;
  createdAt: number;
  byStyle: Array<{ key: string; n: number; passed: number; rate: number }>;
  bySituation: Array<{ key: string; n: number; passed: number; rate: number }>;
  byModel: Array<{ key: string; n: number; passed: number; rate: number }>;
  recs: Array<{
    id: string;
    kind: string;
    claim: string;
    evidence: string;
    examplePromptIds: string[];
    suggestedChange: string;
  }>;
  fails: Array<{
    promptId: string;
    seed: number;
    model: string;
    issues: string[];
    prompt: string;
  }>;
  brittle: Array<{ promptId: string; model: string }>;
};
