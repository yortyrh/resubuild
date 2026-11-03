import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { timestamptz } from './columns';

/**
 * Application tables. Property names are the column names (snake_case) so rows
 * keep the shape of the `@resubuild/types` row types (`CvHeaderRow`, `CvWorkRow`…).
 *
 * `updated_at` columns are maintained by the `public.set_updated_at()` trigger
 * (created in the baseline migration), not by the application.
 */

const id = () => uuid('id').primaryKey().defaultRandom();
const userId = () =>
  uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' });
const createdAt = () =>
  timestamptz('created_at')
    .notNull()
    .default(sql`now()`);
const updatedAt = () =>
  timestamptz('updated_at')
    .notNull()
    .default(sql`now()`);
const jsonArray = (name: string) =>
  jsonb(name)
    .$type<unknown[]>()
    .notNull()
    .default(sql`'[]'::jsonb`);

// ---------------------------------------------------------------------------
// CV header + normalized sections
// ---------------------------------------------------------------------------

export const cv = pgTable(
  'cv',
  {
    id: id(),
    user_id: userId(),
    created_at: createdAt(),
    updated_at: updatedAt(),
    name: text('name'),
    label: text('label'),
    image: text('image'),
    email: text('email'),
    phone: text('phone'),
    url: text('url'),
    summary: text('summary'),
    location: jsonb('location')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    meta_version: text('meta_version'),
    meta_canonical: text('meta_canonical'),
    meta_last_modified: timestamptz('meta_last_modified'),
    template_id: text('template_id').notNull().default('classic'),
    source_cv_id: uuid('source_cv_id').references((): AnyPgColumn => cv.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').notNull().default('primary'),
  },
  (t) => [
    check('cv_kind_check', sql`${t.kind} in ('primary', 'application_clone', 'import_staging')`),
    index('cv_source_cv_id_idx').on(t.source_cv_id),
    index('cv_user_id_updated_at_idx').on(t.user_id, t.updated_at.desc().nullsFirst()),
    index('cv_user_kind_updated_idx').on(t.user_id, t.kind, t.updated_at.desc().nullsFirst()),
  ],
);

const cvId = () =>
  uuid('cv_id')
    .notNull()
    .references(() => cv.id, { onDelete: 'cascade' });
const sort = () => integer('sort').notNull();

export const cvProfile = pgTable(
  'cv_profile',
  {
    id: id(),
    cv_id: cvId(),
    sort: sort(),
    network: text('network'),
    username: text('username'),
    url: text('url'),
  },
  (t) => [index('cv_profile_cv_id_sort_idx').on(t.cv_id, t.sort)],
);

export const cvWork = pgTable(
  'cv_work',
  {
    id: id(),
    cv_id: cvId(),
    name: text('name'),
    location: text('location'),
    description: text('description'),
    position: text('position'),
    url: text('url'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    summary: text('summary'),
    highlights: jsonArray('highlights'),
  },
  (t) => [index('cv_work_cv_id_start_date_idx').on(t.cv_id, t.start_date.desc().nullsFirst())],
);

export const cvVolunteer = pgTable(
  'cv_volunteer',
  {
    id: id(),
    cv_id: cvId(),
    organization: text('organization'),
    position: text('position'),
    url: text('url'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    summary: text('summary'),
    highlights: jsonArray('highlights'),
    location: text('location'),
    description: text('description'),
  },
  (t) => [index('cv_volunteer_cv_id_start_date_idx').on(t.cv_id, t.start_date.desc().nullsFirst())],
);

export const cvEducation = pgTable(
  'cv_education',
  {
    id: id(),
    cv_id: cvId(),
    institution: text('institution'),
    url: text('url'),
    area: text('area'),
    study_type: text('study_type'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    score: text('score'),
    courses: jsonArray('courses'),
  },
  (t) => [index('cv_education_cv_id_start_date_idx').on(t.cv_id, t.start_date.desc().nullsFirst())],
);

export const cvAward = pgTable(
  'cv_award',
  {
    id: id(),
    cv_id: cvId(),
    title: text('title'),
    date: text('date'),
    awarder: text('awarder'),
    summary: text('summary'),
  },
  (t) => [index('cv_award_cv_id_date_idx').on(t.cv_id, t.date.desc().nullsFirst())],
);

export const cvCertificate = pgTable(
  'cv_certificate',
  {
    id: id(),
    cv_id: cvId(),
    name: text('name'),
    date: text('date'),
    url: text('url'),
    issuer: text('issuer'),
  },
  (t) => [index('cv_certificate_cv_id_date_idx').on(t.cv_id, t.date.desc().nullsFirst())],
);

export const cvPublication = pgTable(
  'cv_publication',
  {
    id: id(),
    cv_id: cvId(),
    name: text('name'),
    publisher: text('publisher'),
    release_date: text('release_date'),
    url: text('url'),
    summary: text('summary'),
  },
  (t) => [
    index('cv_publication_cv_id_release_date_idx').on(t.cv_id, t.release_date.desc().nullsFirst()),
  ],
);

export const cvSkill = pgTable(
  'cv_skill',
  {
    id: id(),
    cv_id: cvId(),
    sort: sort(),
    name: text('name'),
    level: text('level'),
    keywords: jsonArray('keywords'),
  },
  (t) => [index('cv_skill_cv_id_sort_idx').on(t.cv_id, t.sort)],
);

export const cvLanguage = pgTable(
  'cv_language',
  {
    id: id(),
    cv_id: cvId(),
    sort: sort(),
    language: text('language'),
    fluency: text('fluency'),
  },
  (t) => [index('cv_language_cv_id_sort_idx').on(t.cv_id, t.sort)],
);

export const cvInterest = pgTable(
  'cv_interest',
  {
    id: id(),
    cv_id: cvId(),
    sort: sort(),
    name: text('name'),
    keywords: jsonArray('keywords'),
  },
  (t) => [index('cv_interest_cv_id_sort_idx').on(t.cv_id, t.sort)],
);

export const cvReference = pgTable(
  'cv_reference',
  {
    id: id(),
    cv_id: cvId(),
    sort: sort(),
    name: text('name'),
    reference: text('reference'),
  },
  (t) => [index('cv_reference_cv_id_sort_idx').on(t.cv_id, t.sort)],
);

export const cvProject = pgTable(
  'cv_project',
  {
    id: id(),
    cv_id: cvId(),
    name: text('name'),
    description: text('description'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    url: text('url'),
    entity: text('entity'),
    type: text('type'),
    highlights: jsonArray('highlights'),
    keywords: jsonArray('keywords'),
    roles: jsonArray('roles'),
  },
  (t) => [index('cv_project_cv_id_start_date_idx').on(t.cv_id, t.start_date.desc().nullsFirst())],
);

export const cvTemplatePresentation = pgTable(
  'cv_template_presentation',
  {
    cv_id: cvId(),
    template_id: text('template_id').notNull(),
    config: jsonb('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updated_at: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'cv_template_presentation_pkey', columns: [t.cv_id, t.template_id] }),
    index('cv_template_presentation_cv_id_idx').on(t.cv_id),
  ],
);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const media = pgTable(
  'media',
  {
    id: id(),
    user_id: userId(),
    storage_path: text('storage_path').notNull().unique('media_storage_path_key'),
    content_type: text('content_type').notNull(),
    size_bytes: bigint('size_bytes', { mode: 'number' }).notNull().default(0),
    created_at: createdAt(),
    crop: jsonb('crop').$type<Record<string, unknown> | null>(),
    cropped_storage_path: text('cropped_storage_path'),
    thumbnail_storage_path: text('thumbnail_storage_path'),
  },
  (t) => [index('media_user_id_created_at_idx').on(t.user_id, t.created_at.desc().nullsFirst())],
);

// ---------------------------------------------------------------------------
// AI agent + web scrape settings
// ---------------------------------------------------------------------------

export const aiAgentAccount = pgTable(
  'ai_agent_account',
  {
    id: id(),
    user_id: userId(),
    label: text('label'),
    provider_id: text('provider_id').notNull(),
    model_id: text('model_id').notNull(),
    api_key_encrypted: text('api_key_encrypted').notNull(),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    uniqueIndex('ai_agent_account_user_label_unique')
      .on(t.user_id, t.label)
      .where(sql`${t.label} is not null`),
  ],
);

export const aiAgentPreference = pgTable('ai_agent_preference', {
  user_id: userId().primaryKey(),
  active_account_id: uuid('active_account_id').references(() => aiAgentAccount.id, {
    onDelete: 'set null',
  }),
  updated_at: updatedAt(),
});

export const webScrapeConfig = pgTable(
  'web_scrape_config',
  {
    user_id: userId().primaryKey(),
    provider: text('provider').notNull(),
    api_key_encrypted: text('api_key_encrypted').notNull(),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [check('web_scrape_config_provider_check', sql`${t.provider} in ('firecrawl', 'tavily')`)],
);

// ---------------------------------------------------------------------------
// Job applications
// ---------------------------------------------------------------------------

export const jobApplication = pgTable(
  'job_application',
  {
    id: id(),
    user_id: userId(),
    status: text('status').notNull().default('queued'),
    job_title: text('job_title'),
    job_company: text('job_company'),
    job_source_type: text('job_source_type'),
    job_raw_text: text('job_raw_text'),
    source_cv_id: uuid('source_cv_id').references(() => cv.id, { onDelete: 'set null' }),
    tailored_cv_id: uuid('tailored_cv_id').references(() => cv.id, { onDelete: 'set null' }),
    cover_letter: text('cover_letter'),
    selection_rationale: text('selection_rationale'),
    created_at: createdAt(),
    updated_at: updatedAt(),
    user_message: text('user_message'),
    intake_source_cv_id: uuid('intake_source_cv_id').references(() => cv.id, {
      onDelete: 'set null',
    }),
    cover_letter_email_subject: text('cover_letter_email_subject'),
    source_cv_snapshot: jsonb('source_cv_snapshot'),
    source_application_id: uuid('source_application_id').references(
      (): AnyPgColumn => jobApplication.id,
      { onDelete: 'set null' },
    ),
    is_list_visible: boolean('is_list_visible').notNull().default(true),
  },
  (t) => [
    index('job_application_source_application_id_idx')
      .on(t.source_application_id)
      .where(sql`${t.source_application_id} is not null`),
    index('job_application_user_list_visible_updated_idx').on(
      t.user_id,
      t.is_list_visible,
      t.updated_at.desc().nullsFirst(),
    ),
    index('job_application_user_updated_idx').on(t.user_id, t.updated_at.desc().nullsFirst()),
  ],
);

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

export const userSettings = pgTable('user_settings', {
  user_id: userId().primaryKey(),
  mcp_enabled: boolean('mcp_enabled').notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const mcpApiKey = pgTable(
  'mcp_api_key',
  {
    user_id: userId().primaryKey(),
    label: text('label'),
    key_prefix: text('key_prefix').notNull(),
    key_hash: text('key_hash').notNull(),
    created_at: createdAt(),
    last_used_at: timestamptz('last_used_at'),
    encrypted_secret: text('encrypted_secret'),
  },
  (t) => [index('mcp_api_key_user_id_idx').on(t.user_id)],
);

export const mcpExport = pgTable(
  'mcp_export',
  {
    id: id(),
    user_id: userId(),
    cv_id: uuid('cv_id').notNull(),
    kind: text('kind').notNull(),
    storage_path: text('storage_path').notNull(),
    content_type: text('content_type').notNull(),
    size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    filename: text('filename').notNull(),
    template_id: text('template_id'),
    mode: text('mode'),
    created_at: createdAt(),
    expires_at: timestamptz('expires_at').notNull(),
  },
  (t) => [
    unique('mcp_export_id_user_id_key').on(t.id, t.user_id),
    check('mcp_export_kind_check', sql`${t.kind} in ('html', 'pdf', 'screenshot', 'jsonresume')`),
    check('mcp_export_size_bytes_check', sql`${t.size_bytes} > 0`),
    index('mcp_export_expiry_idx').on(t.expires_at),
    index('mcp_export_user_idx').on(t.user_id, t.created_at.desc().nullsFirst()),
  ],
);
