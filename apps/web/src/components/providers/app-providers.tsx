import type { ReactNode } from 'react';

/** Root shell wrapper. Auth/query providers live in dashboard and auth layouts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return children;
}
