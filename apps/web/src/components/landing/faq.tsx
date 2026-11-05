import { Band } from '@/components/landing/band';
import { marketingFaqItems } from '@/lib/seo-faq';

export function MarketingFaq() {
  return (
    <Band className="border-border border-t py-20">
      <section
        id="faq"
        aria-labelledby="faq-title"
        className="grid scroll-mt-24 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
      >
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <h2 id="faq-title" className="display text-[2.5rem] sm:text-[3.25rem]">
            Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Writing a CV, choosing a template, and how Resubuild handles your data.
          </p>
        </div>
        <div className="border-foreground border-t">
          {marketingFaqItems.map(({ question, answer }) => (
            <details key={question} className="border-border border-b">
              <summary className="focus-visible:outline-foreground flex cursor-pointer items-center justify-between gap-6 py-5 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
                {question}
                <span
                  aria-hidden="true"
                  className="faq-mark relative size-4 shrink-0 transition-transform duration-200 before:absolute before:inset-x-0 before:top-1/2 before:h-0.5 before:-translate-y-1/2 before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-current"
                />
              </summary>
              <p className="text-muted-foreground max-w-[62ch] pb-6">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </Band>
  );
}
