'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hasSession } from '@/lib/auth-session';

// Header CTA that switches its target based on session state. The same
// `hasSession()` helper used by `HomeRedirect`. We use a client component
// because sessionStorage is a browser-only API.
//
// The primary CTA points to `https://app.resubuild.dev` for anonymous
// visitors and to `/dashboard` for signed-in visitors. The "Log in" link
// is only shown to anonymous visitors; signed-in users see only the
// primary CTA.
export function HeaderCta() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(hasSession());
  }, []);

  return (
    <nav className="flex items-center gap-6 text-sm">
      {signedIn !== true && (
        <Link
          href="/login"
          className="hover:opacity-80"
          style={{ color: 'hsl(var(--marketing-ink) / 0.7)' }}
        >
          Log in
        </Link>
      )}
      <Link
        href={signedIn ? '/dashboard' : 'https://app.resubuild.dev'}
        className="bg-primary text-primary-foreground rounded-full px-4 py-2 font-medium hover:opacity-90"
      >
        {signedIn ? 'Go to dashboard' : 'Try live demo'}
      </Link>
    </nav>
  );
}
