import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CARD } from '../../../../lib/compose';
import { signedInNav } from '../../../../lib/billing';
import { hydrateToken } from '../../../../lib/mint';
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

  return {
    title: piece.title,
    description: piece.note,
    robots: { index: false, follow: false },
    openGraph: {
      title: piece.title,
      description: piece.note,
      images: [{ url: `/c/x/${token}.png`, width: CARD.width, height: CARD.height }],
    },
    twitter: {
      card: 'summary_large_image',
      title: piece.title,
      description: piece.note,
      images: [`/c/x/${token}.png`],
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

  return <Studio piece={piece} email={nav.email} known={nav.known} />;
}
