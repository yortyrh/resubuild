import { SectionHeader } from '@/components/landing/section-header';

const FAQ_ITEMS = [
  {
    q: 'Is the data private?',
    a: 'Yes. Your CVs are stored under your Supabase account with row-level security; only you can read or write them. Resubuild does not sell, share, or train models on your data.',
  },
  {
    q: 'What format is the export?',
    a: 'PDF, HTML, and JSON Resume. The PDF is generated from a print-faithful MIT-format template — what you see in the preview is what you get in the download.',
  },
  {
    q: 'Do I need an account?',
    a: 'To save and manage multiple CVs, yes. You can try the live demo anonymously and only sign up when you want to keep your work.',
  },
  {
    q: 'Can I import a non-PDF CV?',
    a: 'Yes. Import from file accepts JSON, PDF, Markdown, Word (.docx), and image formats (PNG/JPEG/WebP). JSON parses locally; the other formats use the configured import LLM.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Resubuild is free during the public beta. We will announce pricing before any paid plan is introduced.',
  },
] as const;

export function MarketingFaq() {
  return (
    <section id="faq" className="landing-section border-b py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeader
          label="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about Resubuild."
        />

        <div className="landing-faq-list mt-12">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="landing-faq-item">
              <summary>{q}</summary>
              <p className="landing-faq-answer">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
