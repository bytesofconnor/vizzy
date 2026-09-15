import { peekQuota } from '../../../lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    return Response.json(await peekQuota(request));
  } catch (error) {
    console.error('quota peek failed', error);
    return Response.json({ ok: false, error: 'Could not read quota' }, { status: 500 });
  }
}
