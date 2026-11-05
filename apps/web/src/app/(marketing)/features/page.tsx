import type { Metadata } from 'next';
import Link from 'next/link';
import { FeatureCard } from '@/components/features/feature-card';
import { Band } from '@/components/landing/band';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHeader } from '@/components/landing/header';
import { JsonLd } from '@/components/seo/json-ld';
import { RECORDINGS } from '@/lib/recordings';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

const featuresTitle = 'Features';
const featuresDescription =
  'Explore every major Resubuild feature: AI PDF import, MIT-format editor, one-click PDF export, job application tailoring, MCP API, passwordless auth, and more.';

export const metadata: Metadata = {
  title: featuresTitle,
  description: featuresDescription,
  openGraph: {
    title: featuresTitle,
    description: featuresDescription,
    url: '/features',
    images: [siteConfig.ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: featuresTitle,
    description: featuresDescription,
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: '/features',
  },
};

export default function FeaturesPage() {
  return (
    <>
      <JsonLd path="/features" title={featuresTitle} description={featuresDescription} />
      <div className="landing-root min-h-screen">
        <MarketingHeader />

        <main id="main-content">
          <Band className="pb-12 pt-14 sm:pt-20">
            <div className="flex max-w-[44rem] flex-col gap-5">
              <h1 className="display text-[3rem] sm:text-[4.5rem]">Every tool for a polished CV</h1>
              <p className="text-muted-foreground text-lg sm:text-xl">
                From importing the CV you have to a tailored application, here is what Resubuild
                does.
              </p>
            </div>
          </Band>

          <Band className="pb-20">
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {RECORDINGS.map((recording) => (
                <FeatureCard key={recording.id} {...recording} />
              ))}
            </div>
          </Band>

          <Band className="border-border border-t py-20">
            <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="display max-w-[36rem] text-[2.5rem] sm:text-[3.25rem]">
                See it with your own CV
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 items-center rounded-full px-7 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Try the live demo
                </Link>
                <Link
                  href="/register"
                  className="border-input bg-card hover:border-foreground/40 inline-flex h-12 items-center rounded-full border px-7 text-base font-medium"
                >
                  Create a free account
                </Link>
              </div>
            </section>
          </Band>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
