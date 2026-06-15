// Server component. Three numbered steps in a single horizontal row on
// desktop, stacked on mobile. The numbered markers are used here because
// the content is genuinely a sequence (Import → Edit → Export); the
// frontend-design skill explicitly endorses this use of `01/02/03`.

const STEPS = [
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
] as const;

export function MarketingHowItWorks() {
  return (
    <section
      id="how-it-works"
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
          Three steps from PDF to polished CV
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="flex flex-col gap-3">
              <span
                className="font-mono text-sm font-medium uppercase tracking-widest"
                style={{
                  fontFamily: 'var(--marketing-mono-font)',
                  color: 'hsl(var(--primary))',
                }}
              >
                {n}
              </span>
              <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--marketing-ink))' }}>
                {title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'hsl(var(--marketing-ink) / 0.7)' }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
