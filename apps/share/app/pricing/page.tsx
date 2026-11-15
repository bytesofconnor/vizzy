import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccount, signedInNav } from '../../lib/billing';
import { writerPlanEnabled } from '../../lib/writer-plan';
import { KickerNav } from '../components/KickerNav';
import { PricingBoard } from '../components/PricingBoard';
import { SiteFoot } from '../components/SiteFoot';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Three free charts a day, then 25 charts for $8. Writer is a draft subscription.',
  robots: { index: false, follow: false },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; writer?: string }>;
}) {
  if (!writerPlanEnabled()) {
    notFound();
  }

  const { error, writer: writerQuery } = await searchParams;
  let nav: { email?: string; known?: boolean; owner?: boolean } = {};
  let writer = false;
  try {
    nav = await signedInNav();
  } catch {
    nav = {};
  }
  try {
    const account = await getAccount();
    writer = Boolean(account?.writer);
  } catch {
    writer = false;
  }

  const notice =
    error ||
    (writerQuery === '1' && !writer
      ? 'Stripe sent you back. Writer shows up after the test payment is confirmed.'
      : undefined);

  return (
    <main id="content" className="page-main page-pricing">
      <KickerNav here="pricing" email={nav.email} known={nav.known} owner={Boolean(nav.owner)} />
      <header className="pricing-hero">
        <p className="paywall-kicker">Pricing</p>
        <h1>Free, a pack, or Writer</h1>
        <p className="pricing-lede">
          Three free charts a day. Then the live pack, 25 charts for $8. Writer is a draft for newsletters and
          blogs.
        </p>
      </header>
      <PricingBoard notice={notice} writer={writer} />
      <SiteFoot />
    </main>
  );
}
