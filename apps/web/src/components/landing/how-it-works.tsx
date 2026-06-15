import { Download, FileUp, PenLine } from 'lucide-react';
import Link from 'next/link';
import { SectionHeader } from '@/components/landing/section-header';

const STEPS = [
  {
    n: 1,
    icon: FileUp,
    title: 'Import PDF',
    desc: 'Drop any PDF CV and Resubuild extracts the structured resume data using AI.',
  },
  {
    n: 2,
    icon: PenLine,
    title: 'Edit',
    desc: 'Tweak every section in the clean, keyboard-friendly MIT-format editor.',
  },
  {
    n: 3,
    icon: Download,
    title: 'Export PDF',
    desc: 'Download what you see in the preview — a polished PDF, no watermarks.',
  },
] as const;

export function MarketingHowItWorks() {
  return (
    <section id="how-it-works" className="landing-section border-b py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          label="How It Works"
          title={
            <>
              PDF to <span className="landing-gradient-text">Polished CV</span>
            </>
          }
          subtitle="No complex setup. Upload a PDF, refine the result, and export — all in minutes."
        />

        <div className="landing-steps mt-16">
          <div className="landing-steps-track" aria-hidden="true" />
          <div className="landing-steps-grid">
            {STEPS.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="landing-step-card">
                <span className="landing-step-number">{n}</span>
                <div className="landing-step-icon">
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="landing-step-title">{title}</h3>
                <p className="landing-step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 text-center">
          <Link href="/login" className="landing-btn-primary inline-flex px-8 py-3.5 text-base">
            Try the live demo
          </Link>
          <p className="mt-4 text-sm text-[var(--landing-muted)]">
            Free during public beta — no credit card required
          </p>
        </div>
      </div>
    </section>
  );
}
