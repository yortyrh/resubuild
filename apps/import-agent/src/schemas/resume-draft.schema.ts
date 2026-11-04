import { z } from 'zod';

/**
 * Structured-output schema for LLM resume drafts (JSON Resume subset).
 *
 * Every field is declared explicitly (no free-form records) so providers with
 * strict structured outputs accept it; every field is optional because a CV
 * rarely has all of them. The full JSON Resume validation still runs
 * afterwards (`validateResumeSchemaTool`) and drives the repair loop.
 */

const text = z.string().optional();
const textList = z.array(z.string()).optional();

const location = z
  .object({
    address: text,
    postalCode: text,
    city: text,
    countryCode: text,
    region: text,
  })
  .optional();

const profile = z.object({ network: text, username: text, url: text });

export const resumeDraftSchema = z.object({
  basics: z
    .object({
      name: text,
      label: text,
      image: text,
      email: text,
      phone: text,
      url: text,
      summary: text,
      location,
      profiles: z.array(profile).optional(),
    })
    .optional(),
  work: z
    .array(
      z.object({
        name: text,
        location: text,
        description: text,
        position: text,
        url: text,
        startDate: text,
        endDate: text,
        summary: text,
        highlights: textList,
      }),
    )
    .optional(),
  volunteer: z
    .array(
      z.object({
        organization: text,
        position: text,
        url: text,
        startDate: text,
        endDate: text,
        summary: text,
        highlights: textList,
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: text,
        url: text,
        area: text,
        studyType: text,
        startDate: text,
        endDate: text,
        score: text,
        courses: textList,
      }),
    )
    .optional(),
  awards: z.array(z.object({ title: text, date: text, awarder: text, summary: text })).optional(),
  certificates: z.array(z.object({ name: text, date: text, url: text, issuer: text })).optional(),
  publications: z
    .array(z.object({ name: text, publisher: text, releaseDate: text, url: text, summary: text }))
    .optional(),
  skills: z.array(z.object({ name: text, level: text, keywords: textList })).optional(),
  languages: z.array(z.object({ language: text, fluency: text })).optional(),
  interests: z.array(z.object({ name: text, keywords: textList })).optional(),
  references: z.array(z.object({ name: text, reference: text })).optional(),
  projects: z
    .array(
      z.object({
        name: text,
        description: text,
        highlights: textList,
        keywords: textList,
        startDate: text,
        endDate: text,
        url: text,
        roles: textList,
        entity: text,
        type: text,
      }),
    )
    .optional(),
});

export type ResumeDraft = z.infer<typeof resumeDraftSchema>;
