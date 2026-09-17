import type { Metadata } from 'next';
import { JsonLd } from '../../components/JsonLd';
import { WritersLanding } from '../../components/WritersLanding';
import { signedInNav } from '../../../lib/billing';
import { siteUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'For writers',
  description:
    'Charts you can paste into newsletters, blog posts, and reports. Get a link and PNG with the source on the chart.',
  alternates: { canonical: '/for/writers' },
};

export default async function WritersPage({
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
          '@type': 'WebPage',
          name: 'vizzy for writers',
          url: `${origin}/for/writers`,
          description:
            'Charts you can paste into newsletters, blog posts, and reports. Get a link and PNG with the source on the chart.',
          audience: {
            '@type': 'Audience',
            audienceType: 'Writers, journalists, newsletter authors',
          },
        }}
      />
      <WritersLanding
        error={error}
        askPay={pay === '1'}
        email={nav.email}
        known={nav.known}
        owner={Boolean(nav.owner)}
      />
    </>
  );
}
