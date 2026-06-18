import Image from 'next/image';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#faq', label: 'FAQ' },
] as const;

export function MarketingHeader() {
  return (
    <header className="no-print landing-header sticky top-0 z-50 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-vectorized.svg"
            alt="Resubuild"
            width={2172}
            height={724}
            className="landing-logo-lockup"
            priority
            sizes="(max-width: 768px) 160px, 200px"
          />
        </Link>

        <nav className="landing-header-nav hidden items-center gap-8 text-sm md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/login">Log in</Link>
          <Link href="/register" className="landing-btn-primary px-5 py-2.5 text-sm">
            Get Started Free
          </Link>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <Link href="/login" className="text-sm font-medium text-[var(--landing-muted)]">
            Log in
          </Link>
          <Link href="/register" className="landing-btn-primary px-4 py-2 text-sm">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
