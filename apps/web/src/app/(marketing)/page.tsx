import Link from 'next/link';
import { HomeRedirect } from '@/components/auth/home-redirect';
import { MarketingFaq } from '@/components/landing/faq';
import { MarketingFeatures } from '@/components/landing/features';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHowItWorks } from '@/components/landing/how-it-works';
import { MarketingOpenStandard } from '@/components/landing/open-standard';

// The marketing surface. Server-rendered, with one small client island:
//   - <HomeRedirect />         (signed-in fast path)
//
// All animations live in `landing-animations.css` (loaded by the
// (marketing) layout) and respect `prefers-reduced-motion: reduce`.
export default function MarketingPage() {
  return (
    <>
      <HomeRedirect />
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'hsl(var(--marketing-paper))',
          color: 'hsl(var(--marketing-ink))',
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-50 border-b backdrop-blur"
          style={{ borderColor: 'hsl(var(--marketing-rule))' }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="text-xl"
              style={{ fontFamily: 'var(--marketing-display-font)' }}
            >
              Resubuild
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/login"
                className="hover:opacity-80"
                style={{ color: 'hsl(var(--marketing-ink) / 0.7)' }}
              >
                Log in
              </Link>
              <Link
                href="https://app.resubuild.dev"
                className="bg-primary text-primary-foreground rounded-full px-4 py-2 font-medium hover:opacity-90"
              >
                Try live demo
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section
          className="landing-section border-b"
          style={{ borderColor: 'hsl(var(--marketing-rule))' }}
        >
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h1
              className="text-5xl font-medium leading-tight sm:text-6xl"
              style={{
                fontFamily: 'var(--marketing-display-font)',
                color: 'hsl(var(--marketing-ink))',
              }}
            >
              <span className="landing-headline-word">Drop</span>{' '}
              <span className="landing-headline-word">in</span>{' '}
              <span className="landing-headline-word">a</span>{' '}
              <span className="landing-headline-word">PDF.</span>
              <br />
              <span className="landing-headline-word">Get</span>{' '}
              <span className="landing-headline-word">a</span>{' '}
              <span className="landing-headline-word">clean</span>{' '}
              <span className="landing-headline-word">CV</span>{' '}
              <span className="landing-headline-word">in</span>{' '}
              <span className="landing-headline-word">seconds.</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-lg"
              style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
            >
              Upload any existing CV as a PDF and Resubuild extracts the structured data — ready to
              edit in the clean MIT-format editor and export as a polished PDF. No watermarks, no
              formatting fights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="https://app.resubuild.dev"
                className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-base font-medium hover:opacity-90"
              >
                Try the live demo
              </Link>
              <Link
                href="#how-it-works"
                className="text-base hover:opacity-80"
                style={{ color: 'hsl(var(--marketing-ink) / 0.7)' }}
              >
                See how it works →
              </Link>
            </div>
          </div>
        </section>

        <MarketingHowItWorks />
        <MarketingFeatures />
        <MarketingOpenStandard />
        <MarketingFaq />
        <MarketingFooter />
      </div>
    </>
  );
}
