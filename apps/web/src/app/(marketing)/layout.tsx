import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.',
  description:
    'Upload any PDF CV and Resubuild extracts the structured data, ready to edit in the clean MIT-format editor and export as a polished PDF. No watermarks.',
};

// The root `app/layout.tsx` owns the <html> and <body> wrappers, the global
// font stack, and the marketing display font (`--font-display` is registered
// there as well). This route-group layout only exists to override metadata
// and load the marketing CSS; the rendered tree is `children` as-is so the
// marketing surface sits inside the root document without nested <html>/<body>.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
