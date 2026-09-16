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

export type AdminEvalSlice = { key: string; n: number; passed: number; rate: number };

export type EvalRecLoop = 'open' | 'working' | 'wont';

export type AdminEvalDto = {
  runId: string;
  kind: string;
  models: string[];
  repeats: number;
  n: number;
  passed: number;
  rate: number;
  createdAt: number;
  byStyle: AdminEvalSlice[];
  bySituation: AdminEvalSlice[];
  byModel: AdminEvalSlice[];
  byDomain?: AdminEvalSlice[];
  byIssue?: Array<{ code: string; n: number }>;
  recs: Array<{
    id: string;
    kind: string;
    claim: string;
    evidence: string;
    examplePromptIds: string[];
    suggestedChange: string;
    loop?: EvalRecLoop;
  }>;
  fails: Array<{
    promptId: string;
    seed: number;
    model: string;
    issues: string[];
    prompt: string;
  }>;
  brittle: Array<{ promptId: string; model: string }>;
  clearedRecIds?: string[];
};

export function githubEvalIssueUrl(rec: {
  id: string;
  kind: string;
  claim: string;
  evidence: string;
  suggestedChange: string;
  examplePromptIds: string[];
}): string {
  const title = `[eval] ${rec.id} — ${rec.claim}`;
  const body = [
    `## ${rec.claim}`,
    '',
    `Rec \`${rec.id}\` (${rec.kind}). Regenerated on each CI eval publish. It leaves /admin Eval when the canned grid no longer emits this id.`,
    '',
    `**Evidence:** ${rec.evidence}`,
    '',
    `**Do:** ${rec.suggestedChange}`,
    '',
    rec.examplePromptIds.length > 0 ? `**Cells:** ${rec.examplePromptIds.join(', ')}` : '',
    '',
    'Do not auto-merge SYSTEM copy. Human-gated.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
  const params = new URLSearchParams({ title, body });
  return `https://github.com/bytesofconnor/vizzy/issues/new?${params.toString()}`;
}

export async function setEvalRecStatusServer(walletToken: string, recId: string, status: EvalRecLoop) {
  if (!convexUrl() || !process.env.COMPOSE_SERVER_SECRET) {
    throw new Error('Convex is not configured');
  }
  await convexCall<null>('mutation', 'eval:setRecStatus', { walletToken, recId, status });
}

export async function setEvalRecStatus(recId: string, status: EvalRecLoop): Promise<void> {
  const response = await fetch('/api/admin/eval-rec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ recId, status }),
  });
  const body = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error || 'Could not update rec');
  }
}
