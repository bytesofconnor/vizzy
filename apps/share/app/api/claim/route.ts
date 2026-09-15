import { walletTokenForEmail } from '../../../lib/billing';
import { isEmail, normalizeEmail } from '../../../lib/claim';
import { sendClaimLink } from '../../../lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let email = '';
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string') {
      email = normalizeEmail(body.email);
    }
  } catch {
    return Response.json({ ok: false, error: 'Say the email from your first checkout' }, { status: 400 });
  }
  if (!isEmail(email)) {
    return Response.json({ ok: false, error: 'Say the email from your first checkout' }, { status: 400 });
  }

  let hasPack = false;
  try {
    hasPack = Boolean(await walletTokenForEmail(email));
  } catch (error) {
    console.error('claim lookup failed', error);
    return Response.json({ ok: false, error: 'Could not send that' }, { status: 500 });
  }

  if (!hasPack) {
    return Response.json({ ok: true });
  }

  try {
    const sent = await sendClaimLink(email, new URL(request.url).origin);
    if (!sent.sent && !sent.claimUrl) {
      return Response.json({ ok: false, error: 'Email is not configured' }, { status: 503 });
    }
    return Response.json({ ok: true, claimUrl: sent.claimUrl });
  } catch (error) {
    console.error('claim send failed', error);
    return Response.json({ ok: false, error: 'Could not send that' }, { status: 500 });
  }
}
