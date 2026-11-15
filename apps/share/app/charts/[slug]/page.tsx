import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { GalleryChartArticle } from '../../components/GalleryChart';
import { KickerNav } from '../../components/KickerNav';
import { SiteFoot } from '../../components/SiteFoot';
import { signedInNav } from '../../../lib/billing';
import { CARD } from '../../../lib/compose';
import { galleryBySlug, galleryChartModel } from '../../../lib/gallery';
import { loadGalleryPiece } from '../../../lib/gallery-load';
import { siteUrl } from '../../../lib/site';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const chart = galleryBySlug(slug);
  if (!chart) {
    return { title: 'Not found' };
  }
  return {
    title: chart.title,
    description: chart.description,
    alternates: { canonical: `/charts/${slug}` },
    openGraph: {
      title: chart.title,
      description: chart.description,
      images: [{ url: `/charts/${slug}.png`, width: CARD.width, height: CARD.height }],
    },
    twitter: {
      card: 'summary_large_image',
      title: chart.title,
      description: chart.description,
      images: [`/charts/${slug}.png`],
    },
  };
}

export default async function PublicChartPage({ params }: PageProps) {
  const { slug } = await params;
  const chart = galleryBySlug(slug);
  if (!chart) {
    notFound();
  }

  let nav: { email?: string; known?: boolean; owner?: boolean } = {};
  const [signedIn, piece] = await Promise.all([
    signedInNav().catch(() => nav),
    loadGalleryPiece(chart),
  ]);
  nav = signedIn;

  const source = piece?.config.source;
  const model = galleryChartModel(
    chart,
    source
      ? {
          source,
          updated: source.retrieved ?? null,
        }
      : null,
    siteUrl()
  );

  return (
    <main id="content" className="page-main">
      <KickerNav here="home" email={nav.email} known={nav.known} owner={Boolean(nav.owner)} />
      <GalleryChartArticle model={model} />
      <SiteFoot />
    </main>
  );
}
