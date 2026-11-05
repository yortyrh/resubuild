import { cn } from '@/lib/utils';

/**
 * A sample CV page, set like the export template. Decorative: used beside the
 * auth forms and on marketing pages to show what the product produces.
 */
export function CvSpecimen({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'cv-paper pointer-events-none select-none px-[7%] py-[8%] text-[0.8125rem] leading-[1.45]',
        className,
      )}
    >
      <header className="border-page-rule border-b pb-3 text-center">
        <p className="text-2xl font-bold tracking-tight">Ana Castillo</p>
        <p className="mt-0.5">Senior Product Engineer</p>
        <p className="text-page-ink-muted mt-1 text-[0.75rem]">
          ana@castillo.dev, Lisbon, castillo.dev
        </p>
      </header>
      <section className="mt-4">
        <p className="border-page-rule border-b pb-0.5 text-[0.75rem] font-bold tracking-wide">
          Experience
        </p>
        <div className="mt-2">
          <div className="flex items-baseline justify-between gap-4">
            <p>
              <span className="font-bold">Northwind Logistics</span>, Remote
            </p>
            <p className="text-page-ink-muted shrink-0 text-[0.75rem] tabular-nums">
              2021 – Present
            </p>
          </div>
          <p className="italic">Staff Engineer, Checkout</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Cut checkout latency by 40% by moving pricing to the edge</li>
            <li>Led a team of six through the payments platform migration</li>
            <li>Wrote the on-call guide used by four product teams</li>
          </ul>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-4">
            <p>
              <span className="font-bold">Fieldwork Studio</span>, Porto
            </p>
            <p className="text-page-ink-muted shrink-0 text-[0.75rem] tabular-nums">2017 – 2021</p>
          </div>
          <p className="italic">Full-Stack Developer</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Shipped 14 client apps on a shared React and Node toolkit</li>
            <li>Introduced end-to-end tests that halved release rollbacks</li>
          </ul>
        </div>
      </section>
      <section className="mt-4">
        <p className="border-page-rule border-b pb-0.5 text-[0.75rem] font-bold tracking-wide">
          Education
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <p>
            <span className="font-bold">University of Porto</span>
          </p>
          <p className="text-page-ink-muted shrink-0 text-[0.75rem] tabular-nums">2013 – 2017</p>
        </div>
        <p className="font-bold">BSc, Informatics Engineering</p>
      </section>
    </div>
  );
}
