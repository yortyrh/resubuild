import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Page-width content band shared by the marketing pages. */
export function Band({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>;
}

/** Section title set in the condensed display face, with an optional lede. */
export function BandHeading({
  id,
  title,
  lede,
  className,
}: {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex max-w-[40rem] flex-col gap-4', className)}>
      <h2 id={id} className="display text-[2.5rem] sm:text-[3.25rem]">
        {title}
      </h2>
      {lede ? <p className="text-muted-foreground text-lg">{lede}</p> : null}
    </div>
  );
}
