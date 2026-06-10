/**
 * Re-export of the auth query-key factory for callers that prefer the
 * standalone import path. The canonical definition lives in
 * `auth-queries.ts` so React Query hooks can keep their keys co-located
 * with the hook that uses them.
 */
export { authKeys } from './auth-queries';
