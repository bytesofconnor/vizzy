import type { MetadataRoute } from 'next';
import { STUDIO } from '../lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'https://vizzy.run/',
    name: 'Vizzy',
    short_name: 'Vizzy',
    description: 'A chart you can paste.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: STUDIO.paper,
    theme_color: STUDIO.paper,
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
