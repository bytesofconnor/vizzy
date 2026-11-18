import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { readWalletToken, signedInNav } from '../../../lib/billing';
import {
  USAGE_TOKEN_ENV,
  loadUsageWindow,
  usageNeedsAttention,
  type UsageGroup,
  type UsageWindow,
} from '../../../lib/gateway-usage';
import { dayWindow, summarizeAttempts, type RouteAttempts } from '../../../lib/model-attempts';
import { getFunnel, getModelAttempts } from '../../../lib/telemetry';
import { KickerNav } from '../../components/KickerNav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'usage',
  robots: { index: false, follow: false },
};

const body = {
  fontSize: 15,
  lineHeight: 1.5,
  margin: 0,
} as const;

const mute = { color: 'var(--mute)', fontVariantNumeric: 'tabular-nums' } as const;

const cachedUsage = unstable_cache(
  async (days: 7 | 30) => {
    const token = process.env[USAGE_TOKEN_ENV];
    if (!token) {
      return { missingToken: true as const };
    }
    const loaded = await loadUsageWindow(token, days);
    return { missingToken: false as const, ...loaded };
  },
  ['admin-gateway-usage'],
  { revalidate: 120 }
);

export default async function UsagePage() {
  const token = await readWalletToken();
  let owner = false;
  try {
    owner = Boolean(token && (await getFunnel(token)));
  } catch {
    owner = false;
  }
  if (!owner || !token) {
    redirect('/');
  }

  const now = Date.now();
  const week = dayWindow(now, 7);
  const month = dayWindow(now, 30);
  const [weekUsage, monthUsage, attempts, nav] = await Promise.all([
    cachedUsage(7),
    cachedUsage(30),
    getModelAttempts(token),
    signedInNav().catch(() => ({ email: undefined, known: true, owner: true })),
  ]);
  const weekRoutes = summarizeAttempts(attempts, week.fromDay, week.toDay);
  const monthRoutes = summarizeAttempts(attempts, month.fromDay, month.toDay);

  return (
    <main id="content" className="page-main">
      <KickerNav here="admin" owner email={nav.email} known={nav.known ?? true} />
      <h1 className="admin-desk-title">Gateway usage</h1>
      <p className="admin-desk-lede">
        AI Gateway spend and requests for 7 and 30 days. The token stays on the server.
      </p>
      {weekUsage.missingToken || monthUsage.missingToken ? (
        <p style={{ ...body, marginTop: 20, maxWidth: 640 }}>
          Set <code>{USAGE_TOKEN_ENV}</code> on the server to read AI Gateway spend. Tracked model
          failures below still come from this app.
        </p>
      ) : (
        <>
          <UsageBlock usage={weekUsage.window} error={weekUsage.error} tracked={weekRoutes} />
          <UsageBlock usage={monthUsage.window} error={monthUsage.error} tracked={monthRoutes} />
        </>
      )}
      <section style={{ marginTop: 36, maxWidth: 720 }}>
        <h2 style={{ ...body, fontSize: 16 }}>Tracked model attempts</h2>
        <AttemptTable label="7 days" routes={weekRoutes} />
        <AttemptTable label="30 days" routes={monthRoutes} />
      </section>
      <p style={{ ...body, marginTop: 28 }}>
        <a href="/admin">Back to admin</a>
        {' · '}
        <a href="/admin/funnel">Weekly funnel</a>
      </p>
    </main>
  );
}

function UsageBlock({
  usage,
  error,
  tracked,
}: {
  usage?: UsageWindow;
  error?: string;
  tracked: RouteAttempts[];
}) {
  if (!usage) {
    return (
      <p style={{ ...body, marginTop: 16, color: 'var(--mute)' }}>
        {error ?? 'AI Gateway usage did not load.'}
      </p>
    );
  }
  const trackedNotFound = tracked.reduce((sum, row) => sum + row.notFound, 0);
  const trackedForbidden = tracked.reduce((sum, row) => sum + row.forbidden, 0);
  const attention = usageNeedsAttention(usage, trackedNotFound, trackedForbidden);
  return (
    <section style={{ marginTop: 28, maxWidth: 720 }}>
      <h2 style={{ ...body, fontSize: 16 }}>{usage.days} days</h2>
      <p style={{ ...body, marginTop: 8 }}>
        {usage.requestCount} requests · {usd(usage.costUsd)} · error rate {percent(usage.errorRate)}
        {usage.forbidden > 0 ? ` · ${usage.forbidden} forbidden` : ''}
        {usage.notFound > 0 ? ` · ${usage.notFound} not found` : ''}
      </p>
      {attention ? (
        <p style={{ ...body, marginTop: 8 }}>
          Needs a look
          {usage.forbidden > 0 || trackedForbidden > 0 ? ': a 403 means the free tier blocked a model' : ''}
          {usage.notFound > 0 || trackedNotFound > 0 ? ': a model id was not found' : ''}.
        </p>
      ) : null}
      <GroupTable label="By model" rows={usage.byModel} />
      <GroupTable label="By HTTP status" rows={usage.byStatus} />
    </section>
  );
}

function GroupTable({ label, rows }: { label: string; rows: UsageGroup[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ ...body, color: 'var(--mute)' }}>{label}</p>
      {rows.length === 0 ? (
        <p style={{ ...body, marginTop: 6 }}>No rows.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
          {rows.map((row) => (
            <li key={row.key} style={{ ...body, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span>{row.key}</span>
              <span style={mute}>
                {row.count} · {usd(row.costUsd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttemptTable({ label, routes }: { label: string; routes: RouteAttempts[] }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ ...body, color: 'var(--mute)' }}>{label}</p>
      {routes.length === 0 ? (
        <p style={{ ...body, marginTop: 6 }}>No tracked attempts in this window.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
          {routes.map((row) => (
            <li key={row.route} style={{ ...body, marginBottom: 8 }}>
              {row.route}: {row.ok} ok · {row.failed} failed
              {row.forbidden > 0 ? ` · ${row.forbidden} forbidden` : ''}
              {row.notFound > 0 ? ` · ${row.notFound} not found` : ''}
              {row.schema > 0 ? ` · ${row.schema} schema` : ''}
              {row.rateLimit > 0 ? ` · ${row.rateLimit} rate limit` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
