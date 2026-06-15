export function MarketingOpenStandard() {
  return (
    <section className="landing-section border-b py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="landing-callout">
          <h2 className="font-sans text-2xl font-extrabold tracking-tight text-[var(--landing-ink)] sm:text-3xl">
            Built on the open JSON Resume standard
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--landing-muted)]">
            Your data is structured against the{' '}
            <a
              href="https://jsonresume.org"
              className="font-semibold text-[var(--landing-primary-600)] hover:underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              JSON Resume schema
            </a>{' '}
            — an open format for CVs. Export to JSON, HTML, or PDF; switch tools without losing your
            data.
          </p>
        </div>
      </div>
    </section>
  );
}
