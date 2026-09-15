import { Studio } from './components/Studio';
import { JsonLd } from './components/JsonLd';
import { signedInNavEmail } from '../lib/billing';
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
  let email: string | undefined;
  try {
    email = await signedInNavEmail();
  } catch {
    email = undefined;
  }
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Vizzy',
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
      <Studio error={error} askPay={pay === '1'} email={email} />
    </>
  );
}
