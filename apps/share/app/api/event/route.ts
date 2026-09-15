import { bumpEvent } from '../../../lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = /^tap_[a-z0-9_]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || !('name' in body) || typeof body.name !== 'string') {
    return Response.json({ ok: false, error: 'name required' }, { status: 400 });
  }
  if (!ALLOWED.test(body.name)) {
    return Response.json({ ok: false, error: 'unknown event' }, { status: 400 });
  }
  await bumpEvent(body.name);
  return Response.json({ ok: true });
}
