import { cn } from '@/lib/utils';

/**
 * The animated walkthrough shown in "See it work" on the landing page and beside
 * the auth forms: import a PDF, edit it on the page, tailor a
 * copy for a job and export the PDF. It is a recreation of the app drawn with
 * Remotion (`apps/hero-demo`, `pnpm --filter @resubuild/hero-demo render:gif`),
 * not a screen recording. Visitors who prefer reduced motion get a still frame,
 * because a GIF cannot be paused.
 */
export function HeroDemo({
  className,
  loading,
}: {
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  return (
    <figure className={cn('m-0', className)}>
      <div className="surface-soft overflow-hidden">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet="/hero-demo-poster.png" />
          <img
            src="/hero-demo.gif"
            alt="Resubuild in use: a PDF CV is imported into structured fields, a highlight is typed on the page editor, then a copy tailored to a job posting is exported as a PDF."
            width={900}
            height={870}
            decoding="async"
            loading={loading}
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </figure>
  );
}
