import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import './globals.css';
import '@/components/landing/landing-animations.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--marketing-display-font',
  display: 'swap',
});

// Absolute origin used to resolve relative OpenGraph / Twitter image
// paths and the canonical URL. Falls back to the production hostname;
// override via `NEXT_PUBLIC_SITE_URL` in other environments.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://resubuild.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.',
  description:
    'Resubuild extracts structured resume data from any PDF, lets you tweak it in a focused MIT-format editor, and exports a one-click PDF. Your CVs, your account.',
  openGraph: {
    title: 'Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.',
    description:
      'Resubuild extracts structured resume data from any PDF, lets you tweak it in a focused MIT-format editor, and exports a one-click PDF. Your CVs, your account.',
    images: ['/resubuild-banner.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.',
    description:
      'Resubuild extracts structured resume data from any PDF, lets you tweak it in a focused MIT-format editor, and exports a one-click PDF. Your CVs, your account.',
    images: ['/resubuild-banner.jpg'],
  },
  alternates: {
    canonical: '/',
  },
};

// The root `app/layout.tsx` owns the <html> and <body> wrappers and the
// global font stack. This route-group layout overrides the page-level
// metadata (title, description, OG, Twitter, canonical) and registers a
// marketing-only font override so the `--marketing-display-font` CSS
// variable is available to the landing page. The animations partial is
// imported here so its @keyframes are loaded only on the marketing route.
//
// We intentionally keep the rendered tree flat — `children` is wrapped in
// a single element that injects the marketing font class, but we do NOT
// render a second <html> or <body> (that would break SSR hydration).
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={instrumentSerif.variable}>{children}</div>;
}
