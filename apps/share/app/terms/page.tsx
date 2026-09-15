import Link from 'next/link';
import { attachWalletEmail, getWalletState } from '../../lib/billing';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { stripeClient } from '../../lib/stripe';
import { ClaimBox } from '../components/ClaimBox';
import { SiteFoot } from '../components/SiteFoot';

export const dynamic = 'force-dynamic';

const kicker = {
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mute)',
  margin: 0,
} as const;

const body = {
  maxWidth: 540,
  fontSize: 15,
  lineHeight: 1.5,
  marginTop: 14,
} as const;

export default async function TermsPage() {
  let orders: Array<{ createdAt: number; credits: number }> = [];
  try {
    let state = await getWalletState();
    if (state && !state.email && state.orders[0]) {
      const stripe = stripeClient();
      const sessionId = state.orders[0].stripeSessionId;
      if (stripe && sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const email = session.customer_details?.email;
        if (email) {
          await attachWalletEmail(email);
          state = await getWalletState();
        }
      }
    }
    orders = state?.orders ?? [];
  } catch (error) {
    console.error('terms orders failed', error);
  }

  return (
    <main className="page-main">
      <p style={kicker}>
        <Link href="/">Vizzy</Link>
      </p>
      <h1
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.25rem, 5vw, 1.5rem)',
          letterSpacing: '-0.025em',
          margin: '12px 0 0',
        }}
      >
        Terms
      </h1>
      <p style={body}>
        Vizzy draws a chart you can paste. Three free prompts a day. Then {PACK_PRICE_LABEL} for {PACK_CREDITS}{' '}
        more. Paid charts stay on the email from your first checkout. Later buys on this browser add to those
        charts, even if Apple Pay uses another address. This browser keeps a cookie so you don’t have to sign in.
        A new browser picks them up from this page.
      </p>
      <p style={body}>
        The paste URL is the chart. We do not keep a gallery. Payments go through Stripe. Unused charts can be
        refunded through Stripe. A spent prompt is spent.
      </p>
      <p style={{ ...kicker, marginTop: 36 }}>This browser</p>
      {orders.length === 0 ? (
        <p style={body}>No paid charts on this browser.</p>
      ) : (
        <ul style={{ ...body, listStyle: 'none', padding: 0, marginTop: 14 }}>
          {orders.map((order, index) => (
            <li key={`${order.createdAt}-${index}`} style={{ margin: '0 0 8px' }}>
              {formatPaidAt(order.createdAt)} · {order.credits} charts · {PACK_PRICE_LABEL}
            </li>
          ))}
        </ul>
      )}
      <ClaimBox />
      <SiteFoot />
    </main>
  );
}

function formatPaidAt(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
