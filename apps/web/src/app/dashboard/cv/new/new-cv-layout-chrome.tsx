'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getNewCvPageCopy } from './new-cv-page-copy';

export function NewCvLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { title, subtitle } = getNewCvPageCopy(pathname);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Cancel</Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
