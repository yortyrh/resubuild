import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4338ca',
    lang: 'en',
    icons: [
      {
        src: '/icon-2.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
