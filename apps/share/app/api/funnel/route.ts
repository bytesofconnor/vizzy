import { parseTrackBody } from '../../../../../convex/funnel';
import { track } from '../../../lib/track';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON required' }, { status: 400 });
  }
  const parsed = parseTrackBody(body);
  if (!parsed) {
    return Response.json({ ok: false, error: 'unknown event' }, { status: 400 });
  }
  await track(parsed.event, parsed.props);
  return Response.json({ ok: true });
}
