import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['jsdom', '@resvg/resvg-js', 'stripe'],
  transpilePackages: ['@vizzy/core', '@vizzy/react', '@vizzy/resolve'],
  outputFileTracingIncludes: {
    '/agents': ['./content/AGENTS.md'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/icon/32' },
      { source: '/llms.txt', destination: '/api/llms' },
      { source: '/openapi.json', destination: '/api/openapi' },
      { source: '/schema/chart-config.v1.json', destination: '/api/schema' },
      { source: '/c/x/:token.:size.png', destination: '/c/x/:token/png?size=:size' },
      { source: '/c/x/:token.png', destination: '/c/x/:token/png' },
      { source: '/c/:slug.:size.png', destination: '/c/:slug/png?size=:size' },
      { source: '/c/:slug.png', destination: '/c/:slug/png' },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@vizzy/core': path.resolve(__dirname, '../../packages/core/src'),
      '@vizzy/react': path.resolve(__dirname, '../../packages/react/src'),
      '@vizzy/resolve': path.resolve(__dirname, '../../packages/resolve/src'),
    };
    return config;
  },
};

export default nextConfig;
