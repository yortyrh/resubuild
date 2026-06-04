/**
 * Shared Zod input schemas for the per-tool `@Tool` providers.
 *
 * Kept in one file so all 20 tools can reference a single source of truth —
 * the v4-compatible shape mirrors what the prior `mcp-tools.service.ts`
 * declared inline. Each schema is exported separately so per-tool files can
 * `import { xSchema } from '../_schemas'`.
 */
import { z } from 'zod';

export const cvIdSchema = z.object({
  cvId: z.string().uuid(),
});

export const templateOptionalSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
});

export const screenshotSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
  mode: z.enum(['full_document', 'first_page']).optional(),
});

export const presentationSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
});

export const presentationPatchSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
  config: z.record(z.string(), z.unknown()),
});

export const jsonResumeCreateSchema = z.object({
  document: z.record(z.string(), z.unknown()),
});

export const jsonResumeReplaceSchema = z.object({
  cvId: z.string().uuid(),
  document: z.record(z.string(), z.unknown()),
});

export const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

export const updateApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  jobTitle: z.string().nullable().optional(),
  jobCompany: z.string().nullable().optional(),
  jobRawText: z.string().nullable().optional(),
  selectionRationale: z.string().nullable().optional(),
  coverLetterEmailSubject: z.string().nullable().optional(),
  userMessage: z.string().nullable().optional(),
});

export const updateLetterSchema = z.object({
  applicationId: z.string().uuid(),
  coverLetter: z.string(),
});

export const mediaIdSchema = z.object({
  mediaId: z.string().uuid(),
});

export const fetchExportUrlSchema = z.object({
  exportId: z.string().uuid(),
  ttlSeconds: z.number().int().min(60).max(86400).optional(),
});
