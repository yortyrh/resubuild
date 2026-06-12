'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Returns true when the viewport matches the mobile media query
 * (i.e. width strictly below the `md` Tailwind breakpoint at 768px).
 *
 * Defaults to `false` on the server and during the initial client render
 * to avoid hydration mismatches; the real value is applied on the next
 * effect tick.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(MOBILE_QUERY);
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    update(mql);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }

    // Safari < 14 fallback
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return isMobile;
}
