import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Band } from '@/components/landing/band';

const links = [
  { href: '/features', label: 'Features' },
  { href: '/login', label: 'Live demo' },
  { href: '/login', label: 'Sign in' },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-border border-t py-12">
      <Band className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <BrandLogo />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Resubuild. Built on the open JSON Resume standard.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map(({ href, label }) => (
              <li key={label}>
                <Link href={href} className="text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/yortyrh/resubuild"
                className="text-muted-foreground hover:text-foreground"
                rel="noreferrer noopener"
                target="_blank"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </Band>
    </footer>
  );
}
