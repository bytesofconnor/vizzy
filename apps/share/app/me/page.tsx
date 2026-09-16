import type { Metadata } from 'next';
import Link from 'next/link';
import type { ChartConfig, DataPoint } from '@vizzy/core';
import { getAccount, readWalletToken } from '../../lib/billing';
import { listRecentCharts, ownerSession } from '../../lib/telemetry';
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

const rowTitle = {
  fontSize: 15,
  lineHeight: 1.45,
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: '0.18em',
} as const;

const rowMeta = {
  fontSize: 15,
  lineHeight: 1.45,
  color: 'var(--mute)',
  marginTop: 2,
} as const;

export default async function MePage() {
  let account: Awaited<ReturnType<typeof getAccount>> = null;
  let recent: Awaited<ReturnType<typeof listRecentCharts>> = [];
  let owner = false;
  try {
    account = await getAccount();
    const token = await readWalletToken();
    if (token && account) {
      recent = await listRecentCharts(token);
    }
    owner = await ownerSession();
  } catch (error) {
    console.error('account load failed', error);
  }

  const google = Boolean(googleClientId());
  const offerGoogle = Boolean(google && (!account || !account.saved || !account.email));

  return (
    <main id="content" className="page-main">
      <KickerNav here="account" email={account?.email} known={Boolean(account)} owner={owner} />
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
      <p style={body}>{statusLine(account, google)}</p>
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
          <SaveGoogle />
          {account
            ? ' so they follow you on other devices.'
            : ' to bring charts from another browser.'}
        </p>
      ) : null}
      <AccountBuy more={Boolean(account)} />
      {account ? <YourCharts charts={recent} saved={account.saved} /> : null}
      {account && account.used > 0 && !account.unlimited ? (
        <Activity account={account} savedCount={recent.length} />
      ) : null}
      {account ? <Purchases orders={account.orders} /> : null}
      <p style={{ ...body, marginTop: 36 }}>
        <Link href="/" style={rowTitle}>
          Make a chart
        </Link>
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
    if (account.saved) {
      return `${account.credits} chart${account.credits === 1 ? '' : 's'} added to your account.`;
    }
    return `${account.credits} chart${account.credits === 1 ? ' is' : 's are'} on this browser now.`;
  }
  if (account.unlimited && account.credits > 0) {
    return `${account.credits} charts left.`;
  }
  if (account.unlimited) {
    return 'Generate whenever.';
  }
  if (account.credits > 0) {
    return `${account.credits} chart${account.credits === 1 ? '' : 's'} left.`;
  }
  if (account.saved) {
    return 'Signed in.';
  }
  return 'No paid charts left.';
}

function statusLine(account: Awaited<ReturnType<typeof getAccount>>, google = false): string {
  if (!account) {
    return google
      ? `Sign in to bring charts from another browser. Or buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}.`
      : `Buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}, or make a free chart on the home page.`;
  }
  if (account.justPaid) {
    return account.saved
      ? 'Signed in — they follow you on other devices.'
      : 'They stay on this browser until you sign in.';
  }
  if (account.unlimited) {
    return account.saved
      ? 'Generate whenever. These paid charts stay until you use them.'
      : 'Generate whenever.';
  }
  if (account.credits > 0) {
    return account.saved
      ? 'Each chart you make spends one. Buy more any time.'
      : 'Each chart you make spends one.';
  }
  if (account.saved) {
    return 'You still get three free charts a day. Buy a stack when you want paid ones on hand.';
  }
  return `The next ${PACK_CREDITS} are ${PACK_PRICE_LABEL}.`;
}

function YourCharts({
  charts,
  saved,
}: {
  charts: Array<{ slug: string; title: string; createdAt: number }>;
  saved: boolean;
}) {
  return (
    <section style={{ marginTop: 36 }}>
      <p style={kicker}>Your charts</p>
      {charts.length === 0 ? (
        <p style={body}>
          {saved
            ? 'Charts you make show up here as links you can reopen on any device.'
            : 'Charts you make on this browser show up here as links you can reopen.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 14, maxWidth: 540 }}>
          {charts.map((chart) => (
            <li key={`${chart.slug}-${chart.createdAt}`} style={{ margin: '0 0 14px' }}>
              <Link href={`/c/${chart.slug}`} style={rowTitle}>
                {chart.title}
              </Link>
              <p style={rowMeta}>{formatRecentAt(chart.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Activity({
  account,
  savedCount,
}: {
  account: NonNullable<Awaited<ReturnType<typeof getAccount>>>;
  savedCount: number;
}) {
  const activeDays = account.days.filter((row) => row.charts > 0);
  const summary = activitySummary(account.used, activeDays, savedCount);

  return (
    <section style={{ marginTop: 36, maxWidth: 720 }}>
      <p style={kicker}>Activity</p>
      <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>
        Every chart you make spends meter — including ones with no link listed above.
      </p>
      <p style={{ ...body, marginTop: 10 }}>{summary}</p>
      {activeDays.length >= 2 ? (
        <ActivityChart days={activeDays} />
      ) : null}
    </section>
  );
}

function ActivityChart({ days }: { days: Array<{ day: string; charts: number }> }) {
  const data: DataPoint[] = days.map((row) => ({
    day: shortDay(row.day),
    charts: row.charts,
  }));
  const config: ChartConfig = studioChart(
    { type: 'bar', barPadding: 0.36, cornerRadius: 0 },
    { x: 'day', y: 'charts' },
    {
      axes: {
        x: { label: 'Day' },
        y: { label: 'Generated' },
      },
      accessibility: {
        title: 'Charts generated per day, last two weeks',
        description: 'Days when you generated at least one chart.',
      },
    }
  );

  return (
    <div style={{ marginTop: 16 }}>
      <ChartMount config={config} data={data} label="Charts generated per day, last two weeks" />
    </div>
  );
}

function activitySummary(
  used: number,
  activeDays: Array<{ day: string; charts: number }>,
  savedCount: number
): string {
  const noun = `${used} chart${used === 1 ? '' : 's'} generated`;
  const listedNote =
    savedCount > 0
      ? `${savedCount} listed above.`
      : 'None listed above yet.';
  if (activeDays.length === 0) {
    return `${noun} in the last two weeks. ${listedNote}`;
  }
  if (activeDays.length === 1) {
    const only = activeDays[0]!;
    return `${noun} in the last two weeks — all on ${formatDayLabel(only.day)}. ${listedNote}`;
  }
  const busiest = [...activeDays].sort((a, b) => b.charts - a.charts)[0];
  if (busiest && busiest.charts === used) {
    return `${noun} in the last two weeks — busiest on ${formatDayLabel(busiest.day)} (${busiest.charts}). ${listedNote}`;
  }
  return `${noun} across ${activeDays.length} days in the last two weeks. ${listedNote}`;
}

function Purchases({ orders }: { orders: Array<{ createdAt: number; credits: number }> }) {
  return (
    <section style={{ marginTop: 36 }}>
      <p style={kicker}>Purchases</p>
      {orders.length === 0 ? (
        <p style={body}>No Stripe charges on this account.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 14, maxWidth: 540 }}>
          {orders.map((order, index) => (
            <li key={`${order.createdAt}-${index}`} style={{ ...body, margin: '0 0 8px' }}>
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

function formatRecentAt(ms: number): string {
  return formatDayLabel(new Date(ms).toISOString().slice(0, 10));
}

function formatDayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) {
    return day;
  }
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatPaidAt(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
