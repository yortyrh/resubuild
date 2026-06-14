import type { Metadata } from 'next';
import Link from 'next/link';
import { FeatureRecording } from '@/components/features/feature-recording';
import { RECORDINGS } from '@/lib/recordings';

export const metadata: Metadata = {
  title: 'Features — Resubuild',
  description:
    'See every major Resubuild feature in action: AI PDF import, MIT-format editor, one-click PDF export, job application tailoring, MCP API, passwordless auth, and more.',
};

export default function FeaturesPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-flex mx-auto max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-medium">
            Resubuild
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Sign in
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
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="font-display text-foreground text-4xl font-medium leading-tight sm:text-5xl">
            Every feature, in motion.
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Short video walkthroughs of the features that make Resubuild the fastest way to go from
            an existing CV to a polished, tailored job application.
          </p>
          <div className="mt-8">
            <video
              src="/recordings/showcase.mp4"
              poster="/recordings/showcase.png"
              autoPlay
              muted
              loop
              playsInline
              controls
              className="border-border mx-auto max-w-3xl rounded-xl border"
              aria-label="Resubuild feature showcase"
            />
          </div>
        </div>
      </section>

      {/* Recordings grid */}
      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {RECORDINGS.map((recording) => (
            <FeatureRecording
              key={recording.id}
              id={recording.id}
              title={recording.title}
              caption={recording.caption}
            />
          ))}
        </div>
      </main>

      {/* CTA */}
      <section className="border-border bg-surface-soft border-t">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h2 className="font-display text-foreground text-3xl font-medium">
            Ready to try it yourself?
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            Drop in a PDF and get a clean, beautifully formatted CV in seconds. No account required
            to start.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="https://app.resubuild.dev"
              className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-base font-medium hover:opacity-90"
            >
              Open the app
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-base">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
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
  );
}
