import type { MetadataRoute } from 'next';
import { STUDIO } from '../lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'https://vizzy.run/',
    name: 'Vizzy',
    short_name: 'Vizzy',
    description: 'A chart you can paste.',
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    background_color: STUDIO.paper,
    theme_color: STUDIO.paper,
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Make a chart',
        short_name: 'Make one',
        url: '/#make-one',
        description: 'Type or speak what to chart.',
      },
    ],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
