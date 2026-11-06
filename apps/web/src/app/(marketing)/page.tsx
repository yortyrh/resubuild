import Link from 'next/link';
import { HomeRedirect } from '@/components/auth/home-redirect';
import { GuestImportCta } from '@/components/guest-import/guest-import-cta';
import { Band, BandHeading } from '@/components/landing/band';
import { ComposeHero } from '@/components/landing/compose-hero';
import { MarketingFaq } from '@/components/landing/faq';
import { MarketingFooter } from '@/components/landing/footer';
import { MarketingHeader } from '@/components/landing/header';

export const dynamic = 'force-static';

const steps = [
  {
    title: 'Import the CV you have',
    body: 'Drop in a PDF, Word file, or image, or paste a link. The AI reads it into structured JSON Resume fields that you review before saving.',
  },
  {
    title: 'Edit it on the page',
    body: 'Every section looks like the printed CV while you edit it. Fix a date, rewrite a bullet, reorder skills, and see the result as you type.',
  },
  {
    title: 'Export a clean PDF',
    body: 'Pick a template, choose which sections and fields to show, and download the PDF. No watermark. JSON Resume export is one click away.',
  },
];

const editorPoints = [
  {
    title: 'Bullets are plain text',
    body: 'Each highlight is one line of text. Enter starts the next bullet, Backspace at the start joins two, Alt and an arrow key moves one.',
  },
  {
    title: 'Paste from your old CV',
    body: 'Paste several lines into a bullet and each line becomes its own bullet, without the dashes and dots it came with.',
  },
  {
    title: 'Markdown when you want it',
    body: 'Type **bold** or a [link](https://…) and it shows formatted as soon as you leave the bullet, and in the PDF.',
  },
  {
    title: 'Fields where they print',
    body: 'Company and dates on the first line, the role in italics below. The editor uses the same layout and typeface as the export.',
  },
];

const ownership = [
  {
    title: 'Private to your account',
    body: 'Your CVs, applications, and uploads are visible only to you. Delete a CV and it is gone.',
  },
  {
    title: 'An open format',
    body: 'Everything is stored as JSON Resume. Export it at any time and take it to any tool that reads the standard.',
  },
  {
    title: 'Your AI provider, your key',
    body: 'Connect your own Anthropic, OpenAI, Google, or OpenRouter key, or use the included AI where it is offered. Keys are stored encrypted.',
  },
  {
    title: 'Agents can work on it too',
    body: 'Create an API key and connect Resubuild to any MCP client, so an assistant can read and update your CV.',
  },
];

export default function MarketingPage() {
  return (
    <>
      <HomeRedirect />
      <div className="landing-root min-h-screen">
        <MarketingHeader />

        <main id="main-content">
          <Band className="pb-20 pt-14 sm:pt-20">
            <section aria-labelledby="hero-title" className="flex flex-col gap-12">
              <div className="flex max-w-[46rem] flex-col items-start gap-6">
                <h1
                  id="hero-title"
                  className="display text-[3rem] sm:text-[4.5rem] lg:text-[5.25rem]"
                >
                  Drop in a PDF. Get back a CV you can edit.
                </h1>
                <p className="text-muted-foreground max-w-[36rem] text-lg sm:text-xl">
                  Resubuild reads your existing CV into structured fields, lets you edit it as the
                  page it prints on, and exports a clean PDF. Tailor a copy for each job in the same
                  place.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 items-center rounded-full px-7 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    Try the live demo
                  </Link>
                  <GuestImportCta className="border-input bg-card hover:border-foreground/40 focus-visible:ring-ring inline-flex h-12 items-center rounded-full border px-7 text-base font-medium focus-visible:outline-none focus-visible:ring-2" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Free during the public beta. No watermark. Your data exports as JSON Resume.
                </p>
              </div>
              <ComposeHero />
            </section>
          </Band>

          <Band className="border-border border-t py-20">
            <section
              id="how-it-works"
              aria-labelledby="how-title"
              className="flex scroll-mt-24 flex-col gap-12"
            >
              <BandHeading id="how-title" title="From the CV you have to a PDF in three steps" />
              <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex flex-col gap-3">
                    <span aria-hidden="true" className="display text-border text-7xl">
                      {index + 1}
                    </span>
                    <h3 className="wide text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          </Band>

          <Band className="border-border border-t py-20">
            <section
              id="editor"
              aria-labelledby="editor-title"
              className="grid scroll-mt-24 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16"
            >
              <BandHeading
                id="editor-title"
                title="An editor that looks like the page"
                lede="No form full of boxes. You write into the CV itself, and the text you type is the text that prints."
              />
              <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {editorPoints.map((item) => (
                  <div
                    key={item.title}
                    className="border-foreground/80 flex flex-col gap-2 border-t pt-4"
                  >
                    <dt className="wide text-lg font-semibold">{item.title}</dt>
                    <dd className="text-muted-foreground">{item.body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </Band>

          <div className="bg-[hsl(var(--shadow-ink))] text-[hsl(140_10%_92%)]">
            <Band className="py-20">
              <section
                aria-labelledby="ownership-title"
                className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16"
              >
                <h2 id="ownership-title" className="display text-[2.5rem] sm:text-[3.25rem]">
                  Your CV stays yours.
                </h2>
                <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                  {ownership.map((item) => (
                    <div
                      key={item.title}
                      className="flex flex-col gap-2 border-t border-white/20 pt-4"
                    >
                      <dt className="wide text-lg font-semibold">{item.title}</dt>
                      <dd className="text-[hsl(145_7%_70%)]">{item.body}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </Band>
          </div>

          <Band className="py-20">
            <section
              id="applications"
              aria-labelledby="applications-title"
              className="grid scroll-mt-24 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16"
            >
              <div className="flex flex-col gap-6">
                <BandHeading
                  id="applications-title"
                  title="Tailor a copy for each job"
                  lede="Paste the job post. Resubuild makes a copy of your CV that leads with what the role asks for, drops the bullets that do not matter for it, and drafts a cover letter to match."
                />
                <p className="text-muted-foreground">
                  Your original CV is never changed. Edit the tailored copy like any other CV, or
                  promote it to a CV of its own in your library.
                </p>
              </div>
              <figure className="flex flex-col gap-3">
                <div aria-hidden className="cv-paper p-6 text-[0.875rem] leading-[1.5]">
                  <div className="flex items-baseline justify-between gap-3">
                    <p>
                      <span className="font-bold">Northwind Logistics</span>, Remote
                    </p>
                    <p className="text-page-ink-muted shrink-0 text-[0.75rem]">2021 – Present</p>
                  </div>
                  <p className="italic">Staff Engineer, Checkout</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>
                      <span className="marker-text">
                        Cut payment latency by 40% for 3M monthly shoppers
                      </span>{' '}
                      by moving pricing to the edge
                    </li>
                    <li>
                      Led a team of six through the{' '}
                      <span className="marker-text">PCI-compliant</span> payments migration
                    </li>
                    <li>Wrote the on-call guide used by four product teams</li>
                  </ul>
                </div>
                <figcaption className="text-muted-foreground text-sm">
                  Example: the same entry tailored for a payments role. The highlighted wording is
                  what changed.
                </figcaption>
              </figure>
            </section>
          </Band>

          <MarketingFaq />

          <Band className="border-border border-t py-20">
            <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="display max-w-[40rem] text-[2.5rem] sm:text-[3.25rem]">
                Bring the CV you have. Leave with one you can keep editing.
              </h2>
              <Link
                href="/register"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 shrink-0 items-center rounded-full px-7 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Create your free account
              </Link>
            </section>
          </Band>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
