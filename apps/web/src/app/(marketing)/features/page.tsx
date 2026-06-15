import type { Metadata } from 'next';
import Link from 'next/link';
import { FeatureCard } from '@/components/features/feature-card';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHeader } from '@/components/landing/header';
import { SectionHeader } from '@/components/landing/section-header';
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
      <div className="landing-page landing-grid-bg min-h-screen">
        <MarketingHeader />

        <section className="landing-section border-b py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              label="Features"
              title={
                <>
                  Every tool for a <span className="landing-gradient-text">Polished CV</span>
                </>
              }
              subtitle="From PDF import to tailored applications — see what Resubuild offers at a glance."
            />
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {RECORDINGS.map((recording) => (
              <FeatureCard key={recording.id} {...recording} />
            ))}
          </div>
        </main>

        <section className="landing-section border-t py-20 lg:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="landing-section-title text-3xl sm:text-4xl">
              Ready to <span className="landing-gradient-text">try it yourself</span>?
            </h2>
            <p className="landing-section-subtitle">
              Drop in a PDF and get a clean, beautifully formatted CV in seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login" className="landing-btn-primary px-8 py-3.5 text-base">
                Try the live demo
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-[var(--landing-primary-600)] hover:underline"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
