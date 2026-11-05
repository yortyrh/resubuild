'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getGuestImportStatus } from '@/lib/guest-import-api';

/** "Import your CV free" link, shown only while the free import wizard is open. */
export function GuestImportCta({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getGuestImportStatus().then((status) => {
      if (!cancelled) setEnabled(status.enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;
  return (
    <Link href="/import" className={className}>
      Import your CV free
    </Link>
  );
}
