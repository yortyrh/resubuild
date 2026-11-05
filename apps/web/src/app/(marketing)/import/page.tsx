import type { Metadata } from 'next';
import { GuestImportWizard } from '@/components/guest-import/guest-import-wizard';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHeader } from '@/components/landing/header';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

const importTitle = 'Import your CV free';
const importDescription =
  'Upload a PDF, Word or image CV — or link a page — and get a clean, editable JSON Resume in under a minute. No account needed to try.';

export const metadata: Metadata = {
  title: importTitle,
  description: importDescription,
  openGraph: {
    title: importTitle,
    description: importDescription,
    url: '/import',
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: '/import',
  },
};

export default function GuestImportPage() {
  return (
    <div className="landing-page landing-grid-bg min-h-screen">
      <MarketingHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight sm:text-4xl">
          {importTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--landing-muted)]">{importDescription}</p>
        <div className="surface-soft text-card-foreground mt-8 p-6">
          <GuestImportWizard />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
