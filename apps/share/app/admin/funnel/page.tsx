import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { FunnelStep } from '../../../../../convex/funnel';
import { readWalletToken, signedInNav } from '../../../lib/billing';
import { getFunnel } from '../../../lib/telemetry';
import { KickerNav } from '../../components/KickerNav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'funnel',
  robots: { index: false, follow: false },
};

const body = {
  fontSize: 15,
  lineHeight: 1.5,
  margin: 0,
} as const;

export default async function FunnelPage() {
  const token = await readWalletToken();
  const funnel = token ? await getFunnel(token) : null;
  if (!funnel) {
    notFound();
  }

  let nav: { email?: string; known?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = { known: Boolean(token) };
  }

  return (
    <main id="content" className="page-main">
      <KickerNav here="admin" owner email={nav.email} known={nav.known ?? Boolean(token)} />
      <h1 className="admin-desk-title">Weekly funnel</h1>
      <p className="admin-desk-lede">
        {funnel.fromDay} to {funnel.toDay} UTC. The rate is this step divided by the step above, and by visits.
        A later step can happen without the earlier one, so a rate can pass 100%.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 20, maxWidth: 640 }}>
        {funnel.steps.map((step) => (
          <li
            key={step.event}
            style={{
              ...body,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 10,
            }}
          >
            <span>{step.label}</span>
            <span style={{ color: 'var(--mute)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {stepLine(step)}
            </span>
          </li>
        ))}
      </ul>
      <p style={{ ...body, marginTop: 28 }}>
        <a href="/admin">Back to admin</a>
      </p>
    </main>
  );
}

function stepLine(step: FunnelStep): string {
  const previous = rate(step.rateFromPrevious);
  const fromVisit = rate(step.rateFromVisit);
  const split =
    step.event === 'first_chart'
      ? ` · signed out ${step.signedOut ?? 0} · signed in ${step.signedIn ?? 0}`
      : '';
  if (step.event === 'visit') {
    return String(step.count);
  }
  return `${step.count} · ${previous} of previous · ${fromVisit} of visits${split}`;
}

function rate(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }
  return `${Math.round(value * 100)}%`;
}
