import { discoverSocialProfilesTool } from '../tools/discover-social-profiles.tool';
import type { ImportJobProgress } from '../types';

export async function applySocialProfileDiscovery(
  draft: Record<string, unknown>,
  searchApiKey: string | undefined,
  onProgress?: (progress: ImportJobProgress) => void,
): Promise<{ draft: Record<string, unknown>; discoveredProfilesCount: number }> {
  onProgress?.('discovering-profiles');
  const result = await discoverSocialProfilesTool({ draft, searchApiKey });
  return {
    draft: result.draft,
    discoveredProfilesCount: result.discoveredProfilesCount,
  };
}
