import type { Metadata } from 'next';
import { AuthenticatedProviders } from '@/components/providers/authenticated-providers';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
