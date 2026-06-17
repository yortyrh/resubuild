import { marketingFaqItems, type SeoFaqItem } from '@/lib/seo-faq';
import { absoluteUrl, siteConfig } from '@/lib/site';

type JsonLdProps = {
  /** When set, emits WebPage schema alongside WebSite. */
  path?: string;
  title?: string;
  description?: string;
  /** FAQ entries for FAQPage schema; defaults to marketing FAQ on the home page. */
  faqItems?: SeoFaqItem[];
};

function buildFaqPageSchema(pageUrl: string, faqItems: SeoFaqItem[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqItems.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

/** Structured data for search engines on public marketing routes. */
export function JsonLd({ path, title, description, faqItems }: JsonLdProps) {
  const pageUrl = path ? absoluteUrl(path) : siteConfig.url;
  const pageTitle = title ?? siteConfig.title;
  const pageDescription = description ?? siteConfig.description;
  const faqSchemaItems =
    faqItems ?? (path === '/' || path === undefined ? marketingFaqItems : undefined);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: absoluteUrl('/icon-512x512.png'),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { '@id': `${siteConfig.url}/#organization` },
        inLanguage: 'en',
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: pageTitle,
        description: pageDescription,
        isPartOf: { '@id': `${siteConfig.url}/#website` },
        inLanguage: 'en',
        ...(faqSchemaItems ? { mainEntity: { '@id': `${pageUrl}#faq` } } : {}),
      },
      {
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: siteConfig.description,
        url: siteConfig.url,
      },
      ...(faqSchemaItems ? [buildFaqPageSchema(pageUrl, faqSchemaItems)] : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is server-built from static site config
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
