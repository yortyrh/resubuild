import { cn } from '@/lib/utils';

/**
 * The Resubuild mark: a page whose bottom edge turns into a rising arrow. The
 * page is drawn in `currentColor` and the arrow and spark in the primary token,
 * so the mark follows the color scheme. `public/icon.svg` is the same drawing
 * with fixed colors (favicon, PWA icons).
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path stroke="currentColor" d="M41 27V17L31 7H15a6 6 0 0 0-6 6v38a6 6 0 0 0 6 6h9" />
      <path stroke="currentColor" d="M31 7v7a3 3 0 0 0 3 3h7" />
      <path stroke="currentColor" d="M17 32h11M17 42h7" />
      <path fill="hsl(var(--primary))" d="M20 14.5l4 4-4 4-4-4z" />
      <path stroke="hsl(var(--primary))" d="M24 57c15 0 25.5-8 32.5-25.5M47.5 34.5l9-3 1.8 9.6" />
    </svg>
  );
}

/** Mark plus the "Resubuild" wordmark, set as live text in the UI face. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Resubuild"
      className={cn(
        'text-foreground inline-flex items-center gap-2 text-xl font-semibold leading-none tracking-[-0.015em]',
        className,
      )}
    >
      <BrandMark className="size-[1.4em]" />
      <span aria-hidden>Resubuild</span>
    </span>
  );
}
