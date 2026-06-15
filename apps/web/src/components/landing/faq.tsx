import { SectionHeader } from '@/components/landing/section-header';
import { marketingFaqItems } from '@/lib/seo-faq';

export function MarketingFaq() {
  return (
    <section id="faq" className="landing-section border-b py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeader
          label="FAQ"
          title="Frequently Asked Questions"
          subtitle="Resume writing tips, templates, and everything you need to know about Resubuild."
        />

        <div className="landing-faq-list mt-12">
          {marketingFaqItems.map(({ question, answer }) => (
            <details key={question} className="landing-faq-item">
              <summary>{question}</summary>
              <p className="landing-faq-answer">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
