// Server component. Four feature cards styled with the existing
// `surface-soft text-card-foreground` utility per the project's design
// system (see `apps/web/DESIGN.md`). No new card pattern.

import Link from 'next/link';

const FEATURES = [
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
] as const;

export function MarketingFeatures() {
  return (
    <section
      className="landing-section border-b py-20"
      style={{ borderColor: 'hsl(var(--marketing-rule))' }}
    >
      <div className="mx-auto max-w-5xl px-6">
        <h2
          className="text-center text-3xl font-medium"
          style={{
            fontFamily: 'var(--marketing-display-font)',
            color: 'hsl(var(--marketing-ink))',
          }}
        >
          Everything you need
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ title, desc }) => (
            <div key={title} className="surface-soft text-card-foreground rounded-xl p-6">
              <h3 className="text-base font-semibold">{title}</h3>
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
  );
}
