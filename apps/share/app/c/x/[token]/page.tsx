import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { signedInNav } from '../../../../lib/billing';
import { hydrateToken } from '../../../../lib/mint';
import { shareChannel, shareSocialImages } from '../../../../lib/share-channel';
import { siteUrl } from '../../../../lib/site';
import { writerPlanEnabled } from '../../../../lib/writer-plan';
import { FunnelSharedView } from '../../../components/FunnelSharedView';
import { Studio } from '../../../components/Studio';

type PageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const piece = hydrateToken(token);
  if (!piece) {
    return { title: 'Not found' };
  }

  const social = shareSocialImages(`x/${token}`);
  return {
    title: piece.title,
    description: piece.note,
    robots: { index: false, follow: false },
    openGraph: {
      title: piece.title,
      description: piece.note,
      ...social.openGraph,
    },
    twitter: {
      title: piece.title,
      description: piece.note,
      ...social.twitter,
    },
  };
}

export default async function MintedPage({ params }: PageProps) {
  const { token } = await params;
  const piece = hydrateToken(token);
  if (!piece) {
    notFound();
  }

  let nav: { email?: string; known?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = {};
  }

  const channel = shareChannel(piece, { origin: siteUrl() });
  return (
    <>
      <FunnelSharedView />
      <Studio
        piece={piece}
        channel={channel}
        email={nav.email}
        known={nav.known}
        owner={Boolean(nav.owner)}
        writerPlan={writerPlanEnabled()}
      />
    </>
  );
}
