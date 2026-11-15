import type { Metadata } from 'next';
import { GalleryIndex } from '../components/GalleryIndex';
import { GalleryViewTrack } from '../components/GalleryTrack';
import { JsonLd } from '../components/JsonLd';
import { KickerNav } from '../components/KickerNav';
import { SiteFoot } from '../components/SiteFoot';
import { signedInNav } from '../../lib/billing';
import { GALLERY } from '../../lib/gallery';
import { siteUrl } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Public charts of the economy, climate, energy, demographics, and markets. Each one cites a published series.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'Gallery',
    description: 'Public charts of the economy, climate, energy, demographics, and markets.',
    url: '/gallery',
  },
};

export default async function GalleryPage() {
  const origin = siteUrl();
  let nav: { email?: string; known?: boolean; owner?: boolean } = {};
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
          '@type': 'CollectionPage',
          name: 'Vizzy gallery',
          url: `${origin}/gallery`,
          description: 'Public charts of the economy, climate, energy, demographics, and markets.',
          hasPart: GALLERY.map((chart) => ({
            '@type': 'Dataset',
            name: chart.title,
            url: `${origin}/charts/${chart.slug}`,
          })),
        }}
      />
      <KickerNav here="home" email={nav.email} known={nav.known} owner={Boolean(nav.owner)} />
      <GalleryViewTrack />
      <GalleryIndex />
      <SiteFoot />
    </main>
  );
}
