import { readWalletToken } from '../../../../lib/billing';
import { setEvalRecStatusServer, type EvalRecLoop } from '../../../../lib/eval';
import { getAdminInsights } from '../../../../lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = new Set<EvalRecLoop>(['open', 'working', 'wont']);

export async function POST(request: Request) {
  const token = await readWalletToken();
  if (!token) {
    return Response.json({ ok: false, error: 'Sign in as owner' }, { status: 401 });
  }
  const insights = await getAdminInsights(token);
  if (!insights) {
    return Response.json({ ok: false, error: 'Sign in as owner' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  const recId = 'recId' in body && typeof body.recId === 'string' ? body.recId.trim() : '';
  const status = 'status' in body && typeof body.status === 'string' ? body.status : '';
  if (!recId || recId.length > 64 || !STATUSES.has(status as EvalRecLoop)) {
    return Response.json({ ok: false, error: 'recId and status required' }, { status: 400 });
  }
  try {
    await setEvalRecStatusServer(token, recId, status as EvalRecLoop);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
  return Response.json({ ok: true });
}
