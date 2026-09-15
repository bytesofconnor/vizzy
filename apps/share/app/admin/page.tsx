import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readWalletToken } from '../../lib/billing';
import { getAdminInsights } from '../../lib/telemetry';
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
  const insights = token ? await getAdminInsights(token) : null;
  if (!insights) {
    notFound();
  }

  return (
    <main id="content" className="page-main">
      <KickerNav here="admin" owner />
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
        Meter draws count every chart made. Saved links are charts someone can reopen on{' '}
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
        <Stat label="Signed-in people" value={insights.people} />
        <Stat label="Meter draws" value={insights.meterDraws} />
        <Stat label="Saved from prompt" value={insights.savedFromPrompt} />
        <Stat label="Saved from API" value={insights.savedFromPublish} />
        <Stat label="Purchases" value={insights.purchases} />
        <Stat label="AI calls" value={insights.aiCalls} />
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>AI spend (rough)</p>
        <p style={{ ...body, marginTop: 10 }}>
          {formatTokens(insights.aiInputTokens)} in · {formatTokens(insights.aiOutputTokens)} out · about $
          {insights.aiEstimateUsd.toFixed(2)} at Gemini Flash–class rates
        </p>
        {insights.aiCalls === 0 ? (
          <p style={{ ...body, marginTop: 8, color: 'var(--mute)' }}>
            No AI calls logged yet. Make a chart from the home page to record one.
          </p>
        ) : null}
      </section>
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
