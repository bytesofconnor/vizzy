import type { Metadata } from 'next';
import Link from 'next/link';
import type { ChartConfig, DataPoint } from '@vizzy/core';
import type { AccountLibraryPage } from '../../lib/account-chart';
import { getAccount, readWalletToken } from '../../lib/billing';
import { googleClientId } from '../../lib/google';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { listLibraryCharts, listPinnedCharts, ownerSession } from '../../lib/telemetry';
import { studioChart } from '../../lib/theme';
import { AccountBuy } from '../components/AccountBuy';
import { AccountLibrary } from '../components/AccountLibrary';
import { AccountPinned } from '../components/AccountPinned';
import { AccountPurchasesTable } from '../components/AccountPurchasesTable';
import { ChartMount } from '../components/ChartMount';
import { KickerNav } from '../components/KickerNav';
import { SaveGoogle } from '../components/SaveGoogle';
import { SiteFoot } from '../components/SiteFoot';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your charts',
  robots: { index: false, follow: false },
};

const emptyLibrary: AccountLibraryPage = {
  page: [],
  isDone: true,
  continueCursor: '',
};

export default async function MePage() {
  let account: Awaited<ReturnType<typeof getAccount>> = null;
  let library: AccountLibraryPage = emptyLibrary;
  let pinned: Awaited<ReturnType<typeof listPinnedCharts>> = [];
  let owner = false;
  try {
    account = await getAccount();
    owner = Boolean(account?.unlimited);
    if (!owner) {
      owner = await ownerSession();
    }
  } catch (error) {
    console.error('account load failed', error);
    try {
      owner = await ownerSession();
    } catch {
      owner = false;
    }
  }

  try {
    const token = await readWalletToken();
    if (token && account) {
      library = await listLibraryCharts(token, { kind: 'all' });
      pinned = await listPinnedCharts(token, 48);
    }
  } catch (error) {
    console.error('library load failed', error);
  }

  const google = Boolean(googleClientId());
  const offerGoogle = Boolean(google && (!account || !account.saved || !account.email));
  const showUsage = Boolean(account && account.used > 0 && !account.unlimited);
  const showPurchases = Boolean(account && account.orders.length > 0);

  return (
    <main id="content" className="page-main me-desk">
      <KickerNav here="account" email={account?.email} known={Boolean(account)} owner={owner} />
      <header className="me-hero">
        <div>
          <h1>Your charts</h1>
          <p className="me-lede">
            Save the keepers. Search the rest. Open a paste and ask the next public question.
          </p>
        </div>
        <p className="me-make">
          <Link href="/">Make a chart</Link>
        </p>
      </header>
      <div className="me-meter">
        <p className="me-meter-head">{meterLine(account)}</p>
        <p className="me-meter-copy">{statusLine(account, google)}</p>
        {offerGoogle ? (
          <p className="me-meter-copy">
            <SaveGoogle />
            {account
              ? ' so they follow you on other devices.'
              : ' to bring charts from another browser.'}
          </p>
        ) : null}
        <AccountBuy more={Boolean(account)} />
      </div>
      {account ? (
        <nav className="me-jump" aria-label="On this page">
          <a href="#saved">Saved{pinned.length ? ` ${pinned.length}` : ''}</a>
          <a href="#library">Library</a>
          {showUsage ? <a href="#usage">Last 14 days</a> : null}
          {showPurchases ? <a href="#purchases">Purchases</a> : null}
        </nav>
      ) : null}
      {account ? <AccountPinned charts={pinned} /> : null}
      {account ? <AccountLibrary initial={library} saved={account.saved} /> : null}
      {showUsage && account ? <Activity account={account} listed={library.page.length} /> : null}
      {showPurchases && account ? (
        <div id="purchases">
          <AccountPurchasesTable orders={account.orders} />
        </div>
      ) : null}
      <SiteFoot />
    </main>
  );
}

function meterLine(account: Awaited<ReturnType<typeof getAccount>>): string {
  if (!account) {
    return 'No charts on this browser yet.';
  }
  if (account.justPaid && account.credits > 0) {
    return `${account.credits} chart${account.credits === 1 ? '' : 's'} added.`;
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

function Activity({
  account,
  listed,
}: {
  account: NonNullable<Awaited<ReturnType<typeof getAccount>>>;
  listed: number;
}) {
  const activeDays = account.days.filter((row) => row.charts > 0);
  const summary = activitySummary(account.used, activeDays, listed);

  return (
    <section className="me-usage" id="usage" aria-labelledby="usage-title">
      <p id="usage-title" className="admin-log-kicker">
        Last 14 days
      </p>
      <p className="me-lede">{summary}</p>
      {activeDays.length >= 2 ? <ActivityChart days={activeDays} /> : null}
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
  listed: number
): string {
  const noun = `${used} chart${used === 1 ? '' : 's'} generated`;
  const listedNote = listed > 0 ? `${listed} on this page of the library.` : 'None in this library page yet.';
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

function shortDay(day: string): string {
  const parts = day.split('-');
  const month = Number(parts[1]);
  const date = Number(parts[2]);
  if (!month || !date) {
    return day;
  }
  return `${month}/${date}`;
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
