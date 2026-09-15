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
      <p
        style={{
          maxWidth: 540,
          fontSize: 15,
          lineHeight: 1.5,
          marginTop: 14,
        }}
      >
        Owner view. People with email or Google, charts drawn, compose vs publish, purchases, taps, and AI spend.
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
        <Stat label="People" value={insights.people} />
        <Stat label="Charts drawn" value={insights.chartsDrawn} />
        <Stat label="Compose" value={insights.composeCharts} />
        <Stat label="Publish" value={insights.publishCharts} />
        <Stat label="Purchases" value={insights.purchases} />
        <Stat label="AI calls" value={insights.aiCalls} />
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>AI spend (rough)</p>
        <p style={{ fontSize: 15, lineHeight: 1.5, marginTop: 10 }}>
          {formatTokens(insights.aiInputTokens)} in · {formatTokens(insights.aiOutputTokens)} out · about $
          {insights.aiEstimateUsd.toFixed(2)} at Gemini Flash–class rates
        </p>
      </section>
      <section style={{ marginTop: 36, maxWidth: 540 }}>
        <p style={kicker}>Taps</p>
        {insights.taps.length === 0 ? (
          <p style={{ fontSize: 15, lineHeight: 1.5, marginTop: 10 }}>No tap events yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 10, fontSize: 15, lineHeight: 1.6 }}>
            {insights.taps.map((row) => (
              <li key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span>{row.label}</span>
                <span style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}>
                  {row.count}
                </span>
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
          fontSize: '1.35rem',
          letterSpacing: '-0.02em',
          margin: '6px 0 0',
        }}
      >
        {value.toLocaleString('en-US')}
      </p>
    </div>
  );
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
