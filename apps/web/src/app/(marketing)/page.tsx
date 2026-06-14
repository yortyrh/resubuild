import Link from 'next/link';
import { HomeRedirect } from '@/components/auth/home-redirect';
import { HeroVideo } from '@/components/landing/hero-video';

export default function MarketingPage() {
  return (
    <>
      {/*
        Mounted as a sibling so signed-in visitors still get redirected to
        /dashboard (or to /login if their session has expired) without the
        page first having to call a client-only function. HomeRedirect runs
        in useEffect on the client and returns null, so it has no visual
        presence; the marketing surface below is the only thing the visitor
        sees during the one-tick hydration window.
      */}
      <HomeRedirect />
      <div className="bg-background text-foreground min-h-screen">
        {/* Header */}
        <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <span className="font-display text-xl">Resubuild</span>
            <nav className="flex items-center gap-6">
              <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm">
                Log in
              </Link>
              <Link
                href="https://app.resubuild.dev"
                className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Try live demo
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="border-border border-b">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h1 className="font-display text-foreground text-5xl font-medium leading-tight">
              Drop in a PDF.
              <br />
              Get a clean CV in seconds.
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
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
                className="text-muted-foreground hover:text-foreground text-base"
              >
                See how it works →
              </Link>
            </div>
            <div className="mt-14">
              <HeroVideo />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-border border-b py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-display text-foreground text-center text-3xl font-medium">
              Three steps from PDF to polished CV
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  n: '01',
                  title: 'Import PDF',
                  desc: 'Drop any PDF CV and Resubuild extracts the structured resume data using AI.',
                },
                {
                  n: '02',
                  title: 'Edit',
                  desc: 'Tweak every section in the clean, keyboard-friendly MIT-format editor.',
                },
                {
                  n: '03',
                  title: 'Export PDF',
                  desc: 'Download what you see in the preview — a polished PDF, no watermarks.',
                },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex flex-col gap-3">
                  <span className="text-primary font-mono text-sm font-medium">{n}</span>
                  <h3 className="text-foreground text-lg font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-border border-b py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-display text-foreground text-center text-3xl font-medium">
              Everything you need
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: 'AI PDF Import',
                  desc: 'Upload any PDF CV and Resubuild extracts the structured data — no manual retyping.',
                },
                {
                  title: 'MIT-Format Editor',
                  desc: 'Clean, keyboard-friendly editor with every section. No formatting fight, no broken layouts.',
                },
                {
                  title: 'One-Click PDF Export',
                  desc: 'What you see in the preview is what you get in the downloaded PDF.',
                },
                {
                  title: 'Private to your account',
                  desc: 'Your CVs are saved under your account, accessible only to you.',
                },
              ].map(({ title, desc }) => (
                <div key={title} className="border-border bg-surface-soft rounded-xl border p-6">
                  <h3 className="text-foreground text-base font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/features" className="text-primary text-sm hover:underline">
                See all features with video walkthroughs →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="font-display text-foreground text-3xl font-medium">Ready to try it?</h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
              No account required to start. Drop in a PDF and see your CV in seconds.
            </p>
            <div className="mt-8">
              <Link
                href="https://app.resubuild.dev"
                className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-base font-medium hover:opacity-90"
              >
                Open the app — it's free
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-border border-t">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
            <span className="font-display text-muted-foreground text-sm">
              © {new Date().getFullYear()} Resubuild
            </span>
            <div className="text-muted-foreground flex gap-6 text-sm">
              <a href="https://github.com/yortyrh/resubuild" className="hover:text-foreground">
                GitHub
              </a>
              <a href="https://jsonresume.org" className="hover:text-foreground">
                JSON Resume
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
