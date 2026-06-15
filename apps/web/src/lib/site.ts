import { seoKeywords } from '@/lib/seo-faq';

/** Shared site metadata for SEO, sitemap, and Open Graph. */
export const siteConfig = {
  name: 'Resubuild',
  shortName: 'Resubuild',
  title: 'Resubuild — Best AI Resume Builder & Templates',
  description:
    'Build the best resume with AI: import any PDF, edit resume skills and summary in MIT-format templates, and export a professional resume in seconds. Free during public beta.',
  keywords: [...seoKeywords] satisfies string[],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://resubuild.dev',
  ogImage: '/resubuild-banner.jpg',
  twitterHandle: '@resubuild',
  locale: 'en_US',
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}
