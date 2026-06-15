import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { siteConfig } from '@/lib/site';
import './globals.css';
import '@/components/landing/landing-animations.css';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [siteConfig.ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: '/',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd path="/" title={siteConfig.title} description={siteConfig.description} />
      {children}
    </>
  );
}
