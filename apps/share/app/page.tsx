import { Studio } from './components/Studio';
import { JsonLd } from './components/JsonLd';
import { signedInNav } from '../lib/billing';
import { SITE_DESCRIPTION, siteUrl } from '../lib/site';

export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pay?: string }>;
}) {
  const { error, pay } = await searchParams;
  const origin = siteUrl();
  let nav: { email?: string; known?: boolean; owner?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = {};
  }
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'vizzy',
          url: origin,
          description: SITE_DESCRIPTION,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Any',
          offers: {
            '@type': 'Offer',
            price: '8.00',
            priceCurrency: 'USD',
          },
          featureList: ['Bar charts', 'Line charts', 'Scatter plots', 'Paste URL', 'PNG export'],
        }}
      />
      <Studio error={error} askPay={pay === '1'} email={nav.email} known={nav.known} owner={Boolean(nav.owner)} />
    </>
  );
}
