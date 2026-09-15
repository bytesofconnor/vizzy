import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/me', '/admin', '/pay/', '/api/checkout', '/api/save/', '/api/stripe/', '/api/claim'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
