import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { pieceBySlug } from '../../../lib/pieces';
import { CARD } from '../../../lib/compose';
import { Studio } from '../../components/Studio';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ['july', 'price', 'corners', 'tips', 'keep'].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const piece = pieceBySlug(slug);
  if (!piece) {
    return { title: 'Not found' };
  }

  return {
    title: piece.title,
    description: piece.note,
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
  const piece = pieceBySlug(slug);
  if (!piece) {
    notFound();
  }

  return <Studio piece={piece} />;
}
