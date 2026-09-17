import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { signedInNav } from '../../../lib/billing';
import { CARD } from '../../../lib/compose';
import { loadPaste } from '../../../lib/paste';
import { PIECES, pieceBySlug } from '../../../lib/pieces';
import { siteUrl } from '../../../lib/site';
import { JsonLd } from '../../components/JsonLd';
import { Studio } from '../../components/Studio';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PIECES.map((piece) => ({ slug: piece.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const studio = pieceBySlug(slug);
  const piece = studio ?? (await loadPaste(slug));
  if (!piece) {
    return { title: 'Not found' };
  }

  const minted = !studio;
  return {
    title: piece.title,
    description: piece.note,
    robots: minted ? { index: false, follow: false } : undefined,
    alternates: minted ? undefined : { canonical: `/c/${slug}` },
    openGraph: {
      title: piece.title,
      description: piece.note,
      images: [{ url: `/c/${slug}.png`, width: CARD.width, height: CARD.height }],
    },
    twitter: {
      card: 'summary_large_image',
      title: piece.title,
      description: piece.note,
      images: [`/c/${slug}.png`],
    },
  };
}

export default async function PiecePage({ params }: PageProps) {
  const { slug } = await params;
  const studio = pieceBySlug(slug);
  const piece = studio ?? (await loadPaste(slug));
  if (!piece) {
    notFound();
  }

  let nav: { email?: string; known?: boolean } = {};
  try {
    nav = await signedInNav();
  } catch {
    nav = {};
  }

  if (studio) {
    const origin = siteUrl();
    return (
      <>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: piece.title,
            description: piece.note,
            url: `${origin}/c/${slug}`,
            creator: { '@type': 'Organization', name: 'vizzy' },
            isAccessibleForFree: true,
            image: {
              '@type': 'ImageObject',
              url: `${origin}/c/${slug}.png`,
              width: CARD.width,
              height: CARD.height,
            },
          }}
        />
        <Studio piece={piece} email={nav.email} known={nav.known} />
      </>
    );
  }

  return <Studio piece={piece} email={nav.email} known={nav.known} />;
}
