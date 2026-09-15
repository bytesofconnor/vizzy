import { creditPurchase } from './billing';
import { normalizeEmail } from './claim';
import { PACK_CREDITS } from './pack';
import { bumpEvent } from './telemetry';

export async function fulfillCheckoutSession(session: {
  id: string;
  payment_status?: string | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
  customer?: string | { id?: string } | null;
}): Promise<{ ok: boolean; credits: number; walletToken: string } | null> {
  if (session.payment_status && session.payment_status !== 'paid') {
    return null;
  }
  const walletToken = session.client_reference_id || session.metadata?.walletToken;
  if (!walletToken) {
    throw new Error('Checkout session missing wallet');
  }
  const credits = Number(session.metadata?.credits ?? PACK_CREDITS);
  const customer =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? session.customer.id
        : undefined;
  const rawEmail = session.customer_details?.email || session.customer_email || undefined;
  const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
  const result = await creditPurchase({
    walletToken,
    stripeSessionId: session.id,
    credits: Number.isFinite(credits) && credits > 0 ? credits : PACK_CREDITS,
    stripeCustomerId: customer,
    email,
  });
  if (result.ok && !result.duplicate) {
    await bumpEvent('purchase');
  }
  return { ok: result.ok, credits: result.credits, walletToken: result.walletToken };
}
