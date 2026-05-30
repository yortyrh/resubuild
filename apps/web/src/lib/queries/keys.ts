/**
 * Query key factories and invalidation rules:
 * - deleteCv / createCv → invalidate cvKeys.list()
 * - item update → setQueryData on cvKeys.section(cvId, section)
 * - item create/delete/reorder → invalidate cvKeys.section(cvId, section)
 * - AI account mutations → invalidate aiAgentKeys.accounts() and aiAgentKeys.active()
 */

export const cvKeys = {
  all: ['cv'] as const,
  lists: () => [...cvKeys.all, 'list'] as const,
  list: () => cvKeys.lists(),
  details: () => [...cvKeys.all, 'detail'] as const,
  detail: (cvId: string) => [...cvKeys.details(), cvId] as const,
  sections: (cvId: string) => [...cvKeys.detail(cvId), 'section'] as const,
  section: (cvId: string, section: string) => [...cvKeys.sections(cvId), section] as const,
};

export const aiAgentKeys = {
  all: ['ai', 'agents'] as const,
  providers: () => [...aiAgentKeys.all, 'providers'] as const,
  models: (providerId: string) => [...aiAgentKeys.all, 'models', providerId] as const,
  accounts: () => [...aiAgentKeys.all, 'accounts'] as const,
  active: () => [...aiAgentKeys.all, 'active'] as const,
};

export const importKeys = {
  pdfJob: (jobId: string) => ['import', 'job', jobId] as const,
};

export const webScrapeKeys = {
  all: ['web-scrape'] as const,
  config: () => [...webScrapeKeys.all, 'config'] as const,
};
