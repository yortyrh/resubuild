// Server component. Short callout linking to jsonresume.org and naming
// the JSON Resume schema as the export format.

export function MarketingOpenStandard() {
  return (
    <section
      className="landing-section border-b py-20"
      style={{ borderColor: 'hsl(var(--marketing-rule))' }}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2
          className="text-3xl font-medium"
          style={{
            fontFamily: 'var(--marketing-display-font)',
            color: 'hsl(var(--marketing-ink))',
          }}
        >
          Built on the open JSON Resume standard
        </h2>
        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
        >
          Your data is structured against the{' '}
          <a
            href="https://jsonresume.org"
            className="text-primary hover:underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            JSON Resume schema
          </a>{' '}
          — an open format for CVs. Export to JSON, HTML, or PDF; switch tools without losing your
          data.
        </p>
      </div>
    </section>
  );
}
