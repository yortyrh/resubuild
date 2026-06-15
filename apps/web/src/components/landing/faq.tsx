// Server component. FAQ using semantic <details>/<summary> elements per
// the landing-page spec (WCAG-friendly, no JS required).

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
    <section
      className="landing-section border-b py-20"
      style={{ borderColor: 'hsl(var(--marketing-rule))' }}
    >
      <div className="mx-auto max-w-3xl px-6">
        <h2
          className="text-center text-3xl font-medium"
          style={{
            fontFamily: 'var(--marketing-display-font)',
            color: 'hsl(var(--marketing-ink))',
          }}
        >
          Frequently asked
        </h2>
        <div className="mt-12 flex flex-col gap-4">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details
              key={q}
              className="surface-soft text-card-foreground rounded-xl p-4 [&_summary]:cursor-pointer"
            >
              <summary
                className="text-base font-semibold"
                style={{ color: 'hsl(var(--marketing-ink))' }}
              >
                {q}
              </summary>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
              >
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
