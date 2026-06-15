import { Download, FileUp, Lock, PenLine } from 'lucide-react';
import Link from 'next/link';
import { SectionHeader } from '@/components/landing/section-header';

const FEATURES = [
  {
    icon: FileUp,
    title: 'AI PDF Import',
    desc: 'Upload any PDF CV and Resubuild extracts the structured data — no manual retyping.',
  },
  {
    icon: PenLine,
    title: 'MIT-Format Editor',
    desc: 'Clean, keyboard-friendly editor with every section. No formatting fight, no broken layouts.',
  },
  {
    icon: Download,
    title: 'One-Click PDF Export',
    desc: 'What you see in the preview is what you get in the downloaded PDF.',
  },
  {
    icon: Lock,
    title: 'Private to your account',
    desc: 'Your CVs are saved under your account, accessible only to you.',
  },
] as const;

export function MarketingFeatures() {
  return (
    <section id="features" className="landing-section border-b py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          label="Features"
          title={
            <>
              Everything for a <span className="landing-gradient-text">Polished CV</span>
            </>
          }
          subtitle="Resubuild combines AI extraction with a focused editor so you spend time on content, not formatting."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[var(--landing-ink)]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="text-sm font-semibold text-[var(--landing-primary-600)] hover:underline"
          >
            See all features →
          </Link>
        </div>
      </div>
    </section>
  );
}
