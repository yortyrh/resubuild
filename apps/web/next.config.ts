import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@resubuild/types'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/settings/import-llm',
        destination: '/dashboard/settings/ai-agent',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*\\.(jpg|jpeg|png|webp|svg|gif|ico|woff|woff2|mp4|webm)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
