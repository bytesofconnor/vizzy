import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['jsdom', '@resvg/resvg-js', 'stripe'],
  transpilePackages: ['@vizzy/core', '@vizzy/react'],
  async rewrites() {
    return [
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
    };
    return config;
  },
};

export default nextConfig;
