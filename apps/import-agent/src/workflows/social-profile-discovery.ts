import { discoverSocialProfilesTool } from '../tools/discover-social-profiles.tool';
import type { ImportJobProgress } from '../types';

export interface ApplySocialProfileDiscoveryInput {
  draft: Record<string, unknown>;
  searchApiKey: string | undefined;
  onProgress?: (progress: ImportJobProgress) => void;
  /**
   * Original source text (e.g. PDF or image transcription). When provided,
   * discovered candidates whose username does not appear in the source are
   * rejected as they likely belong to a different person.
   */
  sourceText?: string;
}

export async function applySocialProfileDiscovery(
  input: ApplySocialProfileDiscoveryInput,
): Promise<{ draft: Record<string, unknown>; discoveredProfilesCount: number }> {
  input.onProgress?.('discovering-profiles');
  const result = await discoverSocialProfilesTool({
    draft: input.draft,
    searchApiKey: input.searchApiKey,
    sourceText: input.sourceText,
  });
  return {
    draft: result.draft,
    discoveredProfilesCount: result.discoveredProfilesCount,
  };
}
