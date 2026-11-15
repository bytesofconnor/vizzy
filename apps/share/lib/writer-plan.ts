/** Draft prices. These numbers are not Stripe amounts. */
export const WRITER_MONTHLY_LABEL = '$8/mo';
export const WRITER_YEARLY_LABEL = '$72/yr';

export const WRITER_BENEFITS = [
  'No watermark or branding',
  'Unlimited charts',
  'A Library of live-updating charts',
  'Custom brand colors and fonts',
  'Auto-refreshing embeds',
] as const;

export const FREE_PLAN_POINTS = ['3 charts a day', 'A paste link and a PNG', 'The source on the chart'] as const;

export type WriterInterval = 'month' | 'year';

export type WriterWallet = {
  plan?: 'writer';
  writerCheckoutSessionId?: string;
};

export type WriterGrant = {
  plan: 'writer';
  duplicate: boolean;
  writerCheckoutSessionId: string;
};

type UpgradeSession = {
  id: string;
  mode?: string | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
  metadata?: { plan?: string; walletToken?: string } | null;
  customer?: string | { id?: string } | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
};

export type WriterUpgrade =
  | { kind: 'pack' }
  | { kind: 'ignore' }
  | { kind: 'error' }
  | {
      kind: 'grant';
      walletToken: string;
      sessionId: string;
      email?: string;
      stripeCustomerId?: string;
    };

export function writerPlanEnabled(): boolean {
  return process.env.WRITER_PLAN === '1';
}

export function showWriterPaywall(flagOn: boolean, blocked: boolean): boolean {
  return flagOn && blocked;
}

export function parseWriterInterval(value: string | undefined): WriterInterval | null {
  if (value === 'month' || value === 'year') {
    return value;
  }
  return null;
}

export function writerPriceId(interval: WriterInterval, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = interval === 'month' ? env.STRIPE_WRITER_PRICE_MONTHLY : env.STRIPE_WRITER_PRICE_YEARLY;
  const price = raw?.trim();
  return price || undefined;
}

export function writerSecretIsTest(secretKey: string | undefined): boolean {
  const key = secretKey?.trim() ?? '';
  return key.startsWith('sk_test_') || key.startsWith('rk_test_');
}

export function applyWriterGrant(wallet: WriterWallet, sessionId: string): WriterGrant {
  if (wallet.plan === 'writer') {
    return {
      plan: 'writer',
      duplicate: true,
      writerCheckoutSessionId: wallet.writerCheckoutSessionId ?? sessionId,
    };
  }
  return {
    plan: 'writer',
    duplicate: false,
    writerCheckoutSessionId: sessionId,
  };
}

export function writerUpgradeDecision(input: {
  flagOn: boolean;
  livemode: boolean;
  session: UpgradeSession;
}): WriterUpgrade {
  if (input.session.metadata?.plan !== 'writer') {
    return { kind: 'pack' };
  }
  if (!input.flagOn || input.livemode) {
    return { kind: 'ignore' };
  }
  const status = input.session.payment_status;
  if (status && status !== 'paid' && status !== 'no_payment_required') {
    return { kind: 'ignore' };
  }
  const walletToken = input.session.client_reference_id || input.session.metadata?.walletToken;
  if (!walletToken) {
    return { kind: 'error' };
  }
  const customer = input.session.customer;
  const stripeCustomerId =
    typeof customer === 'string' ? customer : customer && typeof customer === 'object' ? customer.id : undefined;
  const email = input.session.customer_details?.email || input.session.customer_email || undefined;
  return {
    kind: 'grant',
    walletToken,
    sessionId: input.session.id,
    ...(email ? { email } : {}),
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
  };
}
