/**
 * Query key factories and invalidation rules:
 * - The CV base (title and basics), each section list and each section entry have
 *   their own key. `detail` is not a prefix of any section key and a list is not a
 *   prefix of its entries, so invalidating one never touches the others.
 * - deleteCv / createCv → invalidate cvKeys.list()
 * - basics save → write `data.basics` into cvKeys.detail(cvId)
 * - item update → write cvKeys.sectionItem and the entry in cvKeys.sectionList
 * - item create / delete / reorder / move → invalidate cvKeys.sectionList (refetch re-seeds entries)
 * - AI account mutations → invalidate aiAgentKeys.accounts() and aiAgentKeys.active()
 */

export const cvKeys = {
  all: ['cv'] as const,
  lists: () => [...cvKeys.all, 'list'] as const,
  list: () => cvKeys.lists(),
  details: () => [...cvKeys.all, 'detail'] as const,
  detail: (cvId: string) => [...cvKeys.details(), cvId] as const,
  sections: (cvId: string) => [...cvKeys.all, 'section', cvId] as const,
  sectionList: (cvId: string, section: string) =>
    [...cvKeys.sections(cvId), section, 'list'] as const,
  sectionItems: (cvId: string, section: string) =>
    [...cvKeys.sections(cvId), section, 'item'] as const,
  sectionItem: (cvId: string, section: string, itemId: string) =>
    [...cvKeys.sectionItems(cvId, section), itemId] as const,
};

export const aiAgentKeys = {
  all: ['ai', 'agents'] as const,
  providers: () => [...aiAgentKeys.all, 'providers'] as const,
  models: (providerId: string) => [...aiAgentKeys.all, 'models', providerId] as const,
  accounts: () => [...aiAgentKeys.all, 'accounts'] as const,
  active: () => [...aiAgentKeys.all, 'active'] as const,
  included: () => [...aiAgentKeys.all, 'included'] as const,
};

/**
 * Rendered cover letter document of an application (same HTML as Print / PDF).
 * Under `['application', id]`, so invalidating the application also refreshes it;
 * the letter edit dialog invalidates it on save.
 */
export function applicationLetterHtmlKey(applicationId: string) {
  return ['application', applicationId, 'letter-html'] as const;
}

export const importKeys = {
  pdfJob: (jobId: string) => ['import', 'job', jobId] as const,
};
