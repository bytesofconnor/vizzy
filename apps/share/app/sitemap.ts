import type { MetadataRoute } from 'next';
import { PIECES } from '../lib/pieces';
import { siteUrl } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const now = new Date();
  return [
    { url: origin, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/for/writers`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${origin}/agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${origin}/llms.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/openapi.json`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/schema/chart-config.v1.json`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ...PIECES.map((piece) => ({
      url: `${origin}/c/${piece.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
