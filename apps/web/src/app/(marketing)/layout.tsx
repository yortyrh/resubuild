import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.',
  description:
    'Upload any PDF CV and Resubuild extracts the structured data, ready to edit in the clean MIT-format editor and export as a polished PDF. No watermarks.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
