import type { Metadata } from 'next';
import { JsonLd } from '../components/JsonLd';
import { KickerNav } from '../components/KickerNav';
import { SiteFoot } from '../components/SiteFoot';
import { agentsMarkdown, renderAgentsMarkdown } from '../../lib/agents-md';
import { signedInNav } from '../../lib/billing';
import { siteUrl } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Agents',
  description: 'Gather rows. Emit ChartConfig v1. Get a paste URL and a PNG. Do not invent D3.',
  alternates: { canonical: '/agents' },
};

export default async function AgentsPage() {
  const markdown = agentsMarkdown();
  const origin = siteUrl();
  let nav: { email?: string; known?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = {};
  }
  return (
    <main id="content" className="page-main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'vizzy for agents',
          url: `${origin}/agents`,
          description: 'Gather rows. Emit ChartConfig v1. Get a paste URL and a PNG.',
        }}
      />
      <KickerNav here="agents" email={nav.email} known={nav.known} owner={Boolean(nav.owner)} />
      <article className="agents-doc">{renderAgentsMarkdown(markdown)}</article>
      <SiteFoot />
    </main>
  );
}
