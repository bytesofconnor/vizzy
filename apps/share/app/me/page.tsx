import type { Metadata } from 'next';
import Link from 'next/link';
import type { ChartConfig, DataPoint } from '@vizzy/core';
import { getAccount } from '../../lib/billing';
import { googleClientId } from '../../lib/google';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { studioChart } from '../../lib/theme';
import { AccountBuy } from '../components/AccountBuy';
import { ChartMount } from '../components/ChartMount';
import { KickerNav } from '../components/KickerNav';
import { SaveGoogle } from '../components/SaveGoogle';
import { SiteFoot } from '../components/SiteFoot';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

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

export default async function MePage() {
  let account: Awaited<ReturnType<typeof getAccount>> = null;
  try {
    account = await getAccount();
  } catch (error) {
    console.error('account load failed', error);
  }

  const google = Boolean(googleClientId());
  const offerGoogle = Boolean(account && google && (!account.saved || !account.email));
  const autoGoogle = Boolean(offerGoogle && account?.justPaid);

  return (
    <main id="content" className="page-main">
      <KickerNav here="account" email={account?.email} />
      <h1
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.45rem, 6vw, 1.9rem)',
          letterSpacing: '-0.02em',
          lineHeight: 1.12,
          margin: '8px 0 0',
        }}
      >
        {headline(account)}
      </h1>
      <p style={body}>{statusLine(account)}</p>
      {offerGoogle ? (
        <p
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 12,
            color: 'var(--mute)',
            margin: '14px 0 0',
            lineHeight: 1.45,
            maxWidth: 540,
          }}
        >
          <SaveGoogle auto={autoGoogle} /> so they follow you on other devices.
        </p>
      ) : null}
      {account?.email ? (
        <p className="account-mail">Signed in as {account.email}.</p>
      ) : null}
      {account && !account.unlimited ? <AccountBuy /> : null}
      {account ? <Usage account={account} /> : null}
      {account ? <Purchases orders={account.orders} /> : null}
      <p style={{ ...kicker, marginTop: 36 }}>
        <Link href="/">Make a chart</Link>
      </p>
      <SiteFoot />
    </main>
  );
}

function headline(account: Awaited<ReturnType<typeof getAccount>>): string {
  if (!account) {
    return 'No charts on this browser yet.';
  }
  if (account.justPaid && account.credits > 0) {
    return `${account.credits} chart${account.credits === 1 ? ' is' : 's are'} on this browser now.`;
  }
  if (account.unlimited && account.credits > 0) {
    return `${account.credits} charts left.`;
  }
  if (account.unlimited) {
    return 'You can draw whenever.';
  }
  if (account.credits > 0) {
    return `${account.credits} chart${account.credits === 1 ? '' : 's'} left.`;
  }
  return 'No paid charts left.';
}

function statusLine(account: Awaited<ReturnType<typeof getAccount>>): string {
  if (!account) {
    return `Buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}, or make a free chart on the home page.`;
  }
  if (account.justPaid) {
    return 'They stay on this browser until you sign in.';
  }
  if (account.unlimited) {
    return account.saved
      ? 'You can draw whenever. These paid charts stay until you use them.'
      : 'You can draw whenever.';
  }
  if (account.credits > 0) {
    return account.saved
      ? 'Each chart you make spends one. Buy more any time.'
      : 'Each chart you make spends one.';
  }
  return `The next ${PACK_CREDITS} are ${PACK_PRICE_LABEL}.`;
}

function Usage({
  account,
}: {
  account: NonNullable<Awaited<ReturnType<typeof getAccount>>>;
}) {
  const data: DataPoint[] = account.days.map((row) => ({
    day: shortDay(row.day),
    charts: row.charts,
  }));
  const config: ChartConfig = studioChart(
    { type: 'bar', barPadding: 0.36, cornerRadius: 0 },
    { x: 'day', y: 'charts' },
    {
      axes: {
        x: { label: 'Day' },
        y: { label: 'Charts' },
      },
      accessibility: {
        title: 'Charts drawn, last 14 days',
        description: 'How many charts this account drew each day for the last two weeks.',
      },
    }
  );

  return (
    <section style={{ marginTop: 36, maxWidth: 720 }}>
      <p style={kicker}>Last 14 days</p>
      <h2
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.25rem, 5vw, 1.5rem)',
          letterSpacing: '-0.025em',
          margin: '4px 0 12px',
        }}
      >
        {account.used === 0 ? 'No charts yet this stretch.' : `${account.used} chart${account.used === 1 ? '' : 's'} drawn.`}
      </h2>
      <ChartMount config={config} data={data} label="Charts drawn, last 14 days" />
    </section>
  );
}

function Purchases({ orders }: { orders: Array<{ createdAt: number; credits: number }> }) {
  return (
    <section style={{ marginTop: 36 }}>
      <p style={kicker}>Purchases</p>
      {orders.length === 0 ? (
        <p style={body}>No Stripe charges on this account.</p>
      ) : (
        <ul style={{ ...body, listStyle: 'none', padding: 0, marginTop: 14 }}>
          {orders.map((order, index) => (
            <li key={`${order.createdAt}-${index}`} style={{ margin: '0 0 8px' }}>
              {formatPaidAt(order.createdAt)} · {order.credits} charts · {PACK_PRICE_LABEL}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function shortDay(day: string): string {
  const parts = day.split('-');
  const month = Number(parts[1]);
  const date = Number(parts[2]);
  if (!month || !date) {
    return day;
  }
  return `${month}/${date}`;
}

function formatPaidAt(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
