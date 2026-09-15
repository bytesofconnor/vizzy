import type { Metadata } from 'next';
import { JsonLd } from '../components/JsonLd';
import { KickerNav } from '../components/KickerNav';
import { SiteFoot } from '../components/SiteFoot';
import { agentsMarkdown, renderAgentsMarkdown } from '../../lib/agents-md';
import { signedInNavEmail } from '../../lib/billing';
import { siteUrl } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Agents',
  description: 'Gather rows. Emit ChartConfig v1. Get a paste URL and a PNG. Do not invent D3.',
  alternates: { canonical: '/agents' },
};

export default async function AgentsPage() {
  const markdown = agentsMarkdown();
  const origin = siteUrl();
  let email: string | undefined;
  try {
    email = await signedInNavEmail();
  } catch {
    email = undefined;
  }
  return (
    <main id="content" className="page-main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Vizzy for agents',
          url: `${origin}/agents`,
          description: 'Gather rows. Emit ChartConfig v1. Get a paste URL and a PNG.',
        }}
      />
      <KickerNav here="agents" email={email} />
      <article className="agents-doc">{renderAgentsMarkdown(markdown)}</article>
      <SiteFoot />
    </main>
  );
}
