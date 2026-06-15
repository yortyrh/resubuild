import Image from 'next/image';
import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="landing-logo-mark h-7 w-7">
              <Image
                src="/icon-2.png"
                alt="Resubuild"
                width={28}
                height={28}
                className="h-7 w-7"
                sizes="28px"
              />
            </span>
            <span className="landing-logo-wordmark text-base">Resubuild</span>
          </div>
          <span className="text-sm text-[var(--landing-muted)]">
            © {new Date().getFullYear()} Resubuild. Built on the open JSON Resume standard.
          </span>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <a
            href="https://app.resubuild.dev"
            className="text-[var(--landing-muted)] hover:text-[var(--landing-ink)]"
            rel="noreferrer noopener"
            target="_blank"
          >
            Live demo
          </a>
          <a
            href="https://github.com/yortyrh/resubuild"
            className="text-[var(--landing-muted)] hover:text-[var(--landing-ink)]"
            rel="noreferrer noopener"
            target="_blank"
          >
            GitHub
          </a>
          <Link
            href="/login"
            className="text-[var(--landing-muted)] hover:text-[var(--landing-ink)]"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
