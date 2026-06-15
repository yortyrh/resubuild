// Server component. Minimal footer with the Resubuild wordmark, three
// links, and a copyright line.

export function MarketingFooter() {
  return (
    <footer className="border-t py-12" style={{ borderColor: 'hsl(var(--marketing-rule))' }}>
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <span
            className="text-base"
            style={{
              fontFamily: 'var(--marketing-display-font)',
              color: 'hsl(var(--marketing-ink))',
            }}
          >
            Resubuild
          </span>
          <span className="text-sm" style={{ color: 'hsl(var(--marketing-ink) / 0.6)' }}>
            © {new Date().getFullYear()} Resubuild. Built on the open JSON Resume standard.
          </span>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <a
            href="https://app.resubuild.dev"
            className="hover:opacity-80"
            style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
            rel="noreferrer noopener"
            target="_blank"
          >
            Live demo
          </a>
          <a
            href="https://github.com/yortyrh/resubuild"
            className="hover:opacity-80"
            style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
            rel="noreferrer noopener"
            target="_blank"
          >
            GitHub
          </a>
          <a
            href="/login"
            className="hover:opacity-80"
            style={{ color: 'hsl(var(--marketing-ink) / 0.75)' }}
          >
            Sign in
          </a>
        </nav>
      </div>
    </footer>
  );
}
