import Image from 'next/image';
import Link from 'next/link';
import logoSvg from '@/components/landing/logo-vectorized.svg';

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <Image
            src={logoSvg}
            alt="Resubuild"
            width={2172}
            height={724}
            className="landing-logo-lockup-sm"
            sizes="140px"
          />
          <span className="text-sm text-[var(--landing-muted)]">
            © {new Date().getFullYear()} Resubuild. Built on the open JSON Resume standard.
          </span>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <Link
            href="/dashboard"
            className="text-[var(--landing-muted)] hover:text-[var(--landing-ink)]"
          >
            Live demo
          </Link>
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
