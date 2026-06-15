import Link from 'next/link';
import { HomeRedirect } from '@/components/auth/home-redirect';
import { MarketingFaq } from '@/components/landing/faq';
import { MarketingFeatures } from '@/components/landing/features';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHeader } from '@/components/landing/header';
import { HeroVisual } from '@/components/landing/hero-visual';
import { MarketingHowItWorks } from '@/components/landing/how-it-works';
import { MarketingOpenStandard } from '@/components/landing/open-standard';

export const dynamic = 'force-static';

export default function MarketingPage() {
  return (
    <>
      <HomeRedirect />
      <div className="landing-page landing-grid-bg min-h-screen">
        <MarketingHeader />

        <main id="main-content">
          <section className="landing-hero landing-section border-b">
            <div className="landing-hero-glow" aria-hidden="true" />
            <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:gap-12 md:py-10 lg:gap-16 lg:py-24">
              <div className="text-left">
                <span className="landing-eyebrow">
                  <span className="landing-pulse-dot" aria-hidden="true" />
                  AI-powered CV builder
                </span>

                <h1 className="mt-6 font-sans text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="landing-headline-solid landing-headline-word">
                    Drop in a PDF.
                  </span>
                  <br />
                  <span className="landing-gradient-text landing-headline-word">
                    Get a clean CV in seconds.
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--landing-muted)]">
                  Upload any existing CV as a PDF and Resubuild extracts the structured data — ready
                  to edit in the clean MIT-format editor and export as a polished PDF. No
                  watermarks, no formatting fights.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link href="/login" className="landing-btn-primary px-8 py-3.5 text-base">
                    Try the live demo
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="landing-btn-secondary px-8 py-3.5 text-base"
                  >
                    See how it works
                  </Link>
                </div>

                <div className="landing-trust-row mt-8 flex flex-wrap gap-x-6 gap-y-2">
                  <span>✓ Free during public beta</span>
                  <span>✓ No watermarks</span>
                  <span>✓ Open JSON Resume standard</span>
                </div>
              </div>

              <div className="relative w-full">
                <HeroVisual />
              </div>
            </div>
          </section>

          <MarketingFeatures />
          <MarketingHowItWorks />
          <MarketingOpenStandard />
          <MarketingFaq />
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
