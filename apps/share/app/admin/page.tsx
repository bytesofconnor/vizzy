import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  estimateLoggedSpend,
  fetchGatewayStatus,
  formatPerMillion,
  formatUsd,
} from '../../lib/ai-gateway';
import { STACK_MODELS } from '../../lib/ai-models';
import { readWalletToken, signedInNav } from '../../lib/billing';
import { getAdminInsights, type AdminInsights } from '../../lib/telemetry';
import { KickerNav } from '../components/KickerNav';
import { SiteFoot } from '../components/SiteFoot';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
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
  fontSize: 15,
  lineHeight: 1.5,
  margin: 0,
} as const;

export default async function AdminPage() {
  const token = await readWalletToken();
  const [insights, gateway] = await Promise.all([
    token ? getAdminInsights(token) : Promise.resolve(null),
    fetchGatewayStatus(),
  ]);
  if (!insights) {
    notFound();
  }
  const loggedSpend = estimateLoggedSpend(insights.aiByModel, gateway.catalog);
  const catalogById = new Map(gateway.catalog.map((row) => [row.id, row]));

  let nav: { email?: string; known?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = { known: Boolean(token) };
  }

  return (
    <main id="content" className="page-main">
      <KickerNav here="admin" owner email={nav.email} known={nav.known ?? Boolean(token)} />
      <h1
        style={{
          fontWeight: 500,
          fontSize: 'clamp(1.45rem, 6vw, 1.9rem)',
          letterSpacing: '-0.02em',
          lineHeight: 1.12,
          margin: '8px 0 0',
        }}
      >
        Last 30 days
      </h1>
      <p style={{ ...body, maxWidth: 540, marginTop: 14 }}>
        Charts generated counts every compose and publish. Saved links are charts someone can reopen on{' '}
        <span style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace', fontSize: 13 }}>/me</span>.
        AI spend only tracks calls after logging shipped.
      </p>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginTop: 28,
          maxWidth: 720,
        }}
      >
        <Stat label="Known accounts" value={insights.people} />
        <Stat label="Charts generated" value={insights.meterDraws} />
        <Stat label="Saved from prompt" value={insights.savedFromPrompt} />
        <Stat label="Saved from API" value={insights.savedFromPublish} />
        <Stat label="Purchases" value={insights.purchases} />
        <Stat label="AI calls" value={insights.aiCalls} />
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>AI · logged (30 days)</p>
        {insights.aiCalls === 0 ? (
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>
            No AI calls logged yet. Make a chart from the home page to record one.
          </p>
        ) : (
          <p style={{ ...body, marginTop: 10 }}>
            {formatTokens(insights.aiInputTokens)} in · {formatTokens(insights.aiOutputTokens)} out ·{' '}
            {insights.aiCalls} call{insights.aiCalls === 1 ? '' : 's'} · ~{formatUsd(loggedSpend.usd)} at gateway
            catalog rates
          </p>
        )}
        {loggedSpend.unknownModels.length > 0 ? (
          <p style={{ ...body, marginTop: 8, color: 'var(--mute)' }}>
            No catalog price for: {loggedSpend.unknownModels.join(', ')}
          </p>
        ) : null}
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>AI · gateway credits</p>
        {!gateway.configured ? (
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>
            Set <span style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}>AI_GATEWAY_API_KEY</span>{' '}
            on Vercel to read team balance and limits from the gateway.
          </p>
        ) : gateway.creditsError ? (
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>{gateway.creditsError}</p>
        ) : gateway.credits ? (
          <p style={{ ...body, marginTop: 10 }}>
            {formatUsd(gateway.credits.balanceUsd)} left · {formatUsd(gateway.credits.totalUsedUsd)} used lifetime
          </p>
        ) : null}
        {gateway.configured && gateway.credits ? (
          <p style={{ ...body, marginTop: 8, color: 'var(--mute)' }}>
            Budget and rate limits live in the{' '}
            <a href="https://vercel.com/dashboard/ai-gateway" target="_blank" rel="noopener noreferrer">
              Vercel AI Gateway
            </a>{' '}
            dashboard — not stored here.
          </p>
        ) : null}
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>AI · model catalog</p>
        {gateway.catalogError ? (
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>{gateway.catalogError}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
            {STACK_MODELS.map((id) => {
              const row = catalogById.get(id);
              const used = insights.aiByModel.find((entry) => entry.model === id);
              return (
                <li key={id} style={{ ...body, marginBottom: 12 }}>
                  <p style={{ fontWeight: 500, margin: 0 }}>{row?.name ?? id}</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--mute)' }}>
                    {row
                      ? `${formatPerMillion(row.inputPerToken)} in · ${formatPerMillion(row.outputPerToken)} out${
                          row.contextWindow ? ` · ${formatTokens(row.contextWindow)} ctx` : ''
                        }${row.maxOutputTokens ? ` · ${formatTokens(row.maxOutputTokens)} max out` : ''}`
                      : 'Not in gateway catalog'}
                    {used
                      ? ` · ${used.calls} logged call${used.calls === 1 ? '' : 's'} (${formatTokens(used.inputTokens)} in)`
                      : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {insights.users.length > 0 ? (
        <DetailList
          title="Users"
          rows={insights.users.map((row) => ({
            key: row.email,
            primary: row.email,
            secondary: userSecondary(row),
          }))}
        />
      ) : (
        <section style={{ marginTop: 36, maxWidth: 540 }}>
          <p style={kicker}>Users</p>
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>
            No Google sign-ins or checkout emails yet. Wallets without an email stay anonymous.
          </p>
        </section>
      )}
      {insights.recentAi.length > 0 ? (
        <DetailList
          title="Recent AI calls"
          rows={insights.recentAi.map((row) => ({
            key: `${row.createdAt}-${row.route}`,
            primary: `${aiRouteLabel(row.route)} · ${shortModel(row.model)}`,
            secondary: `${formatTokens(row.inputTokens)} in · ${formatTokens(row.outputTokens)} out · ${formatWhen(row.createdAt)}`,
          }))}
        />
      ) : null}
      {insights.recentSaved.length > 0 ? (
        <DetailList
          title="Recent saved charts"
          rows={insights.recentSaved.map((row) => ({
            key: `${row.createdAt}-${row.title}`,
            primary: row.title,
            secondary: `${row.route === 'compose' ? 'From prompt' : 'From API'} · ${formatWhen(row.createdAt)}`,
          }))}
        />
      ) : null}
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>Events</p>
        {insights.taps.length === 0 ? (
          <p style={{ ...body, marginTop: 10, color: 'var(--mute)' }}>No events yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
            {insights.taps.map((row) => (
              <li
                key={row.label}
                style={{
                  ...body,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 8,
                }}
              >
                <span>{eventLabel(row.label)}</span>
                <span style={{ color: 'var(--mute)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFoot />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '14px 12px',
      }}
    >
      <p style={kicker}>{label}</p>
      <p
        style={{
          fontWeight: 500,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          margin: '6px 0 0',
        }}
      >
        {value.toLocaleString('en-US')}
      </p>
    </div>
  );
}

function DetailList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; primary: string; secondary: string }>;
}) {
  return (
    <section style={{ marginTop: 36, maxWidth: 540 }}>
      <p style={kicker}>{title}</p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
        {rows.map((row) => (
          <li key={row.key} style={{ marginBottom: 12 }}>
            <p style={{ ...body, fontWeight: 500 }}>{row.primary}</p>
            <p style={{ ...body, marginTop: 2, color: 'var(--mute)' }}>{row.secondary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function userSecondary(row: AdminInsights['users'][number]): string {
  const viaLabels = row.vias.map((via) => (via === 'google' ? 'Google sign-in' : 'Checkout email'));
  const via = viaLabels.length > 0 ? viaLabels.join(' · ') : 'Email only';
  const credits =
    row.owner && row.credits === 0
      ? 'Owner · unlimited'
      : `${row.credits} chart${row.credits === 1 ? '' : 's'} left${row.owner ? ' · owner' : ''}`;
  return `${via} · ${credits} · since ${formatWhen(row.createdAt)}`;
}

function eventLabel(name: string): string {
  const labels: Record<string, string> = {
    chart_compose: 'Chart saved from prompt',
    chart_publish: 'Chart saved from API',
    checkout: 'Checkout started',
    purchase: 'Purchase completed',
    sign_in: 'Google sign-in',
    tap_agents: 'Agents link tapped',
    tap_terms: 'Terms link tapped',
    tap_llms: 'llms.txt link tapped',
  };
  return labels[name] ?? name.replace(/_/g, ' ');
}

function aiRouteLabel(route: string): string {
  if (route === 'compose') {
    return 'Draft chart';
  }
  if (route === 'lookup') {
    return 'Lookup';
  }
  if (route === 'lookup_sonar') {
    return 'Sonar lookup';
  }
  return route;
}

function shortModel(model: string): string {
  const tail = model.split('/').pop() ?? model;
  return tail.length > 28 ? `${tail.slice(0, 25)}…` : tail;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
