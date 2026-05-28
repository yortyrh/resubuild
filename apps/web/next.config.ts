import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@resumind/types'],
  async redirects() {
    return [
      {
        source: '/dashboard/settings/import-llm',
        destination: '/dashboard/settings/ai-agent',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
