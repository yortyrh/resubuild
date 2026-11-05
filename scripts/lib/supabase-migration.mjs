/**
 * Pure mapping helpers for scripts/migrate-from-supabase.mjs (no I/O).
 *
 * Supabase Auth keeps users in `auth.users` (bcrypt `encrypted_password`) and
 * OAuth links in `auth.identities`. Better Auth uses `public."user"` and
 * `public.account`. User ids are preserved, so every `user_id` foreign key in
 * the application tables stays valid.
 */

/** Application tables in foreign-key order. `selfRef` columns are filled in a second pass. */
export const APP_TABLES = Object.freeze([
  { name: 'cv', selfRef: 'source_cv_id' },
  { name: 'cv_profile' },
  { name: 'cv_work' },
  { name: 'cv_volunteer' },
  { name: 'cv_education' },
  { name: 'cv_award' },
  { name: 'cv_certificate' },
  { name: 'cv_publication' },
  { name: 'cv_skill' },
  { name: 'cv_language' },
  { name: 'cv_interest' },
  { name: 'cv_reference' },
  { name: 'cv_project' },
  { name: 'cv_template_presentation', key: ['cv_id', 'template_id'] },
  { name: 'media' },
  { name: 'ai_agent_account' },
  { name: 'ai_agent_preference', key: ['user_id'] },
  { name: 'job_application', selfRef: 'source_application_id' },
  { name: 'user_settings', key: ['user_id'] },
  { name: 'mcp_api_key', key: ['user_id'] },
  { name: 'mcp_export' },
]);

/** Supabase identity provider → Better Auth providerId. */
export const PROVIDER_MAP = Object.freeze({
  github: 'github',
  google: 'google',
  linkedin_oidc: 'linkedin',
});

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * @param {{ id: string, email: string | null, email_confirmed_at: Date | string | null,
 *   raw_user_meta_data: Record<string, unknown> | null, created_at: Date | string, updated_at: Date | string | null }} row
 * @returns {{ id: string, name: string, email: string, email_verified: boolean, image: string | null,
 *   created_at: Date | string, updated_at: Date | string } | null} null when the user has no email
 */
export function mapAuthUser(row) {
  const email = row.email?.trim().toLowerCase();
  if (!email) return null;
  const meta = row.raw_user_meta_data ?? {};
  return {
    id: row.id,
    name:
      firstString(meta.full_name, meta.name, meta.user_name, meta.preferred_username) ??
      email.split('@')[0],
    email,
    email_verified: Boolean(row.email_confirmed_at),
    image: firstString(meta.avatar_url, meta.picture),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

/**
 * Email/password credential (bcrypt hash kept as-is; the API verifies bcrypt
 * and upgrades it to scrypt on the next sign-in).
 *
 * @param {{ id: string, encrypted_password: string | null, created_at: Date | string }} row
 */
export function mapCredentialAccount(row) {
  if (!row.encrypted_password || !row.encrypted_password.startsWith('$2')) return null;
  return {
    account_id: row.id,
    provider_id: 'credential',
    user_id: row.id,
    password: row.encrypted_password,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

/**
 * OAuth identity → account. `provider_id` in auth.identities is the provider's
 * user id (GitHub numeric id, Google/LinkedIn `sub`), which Better Auth stores
 * as `accountId` and matches on the next OAuth sign-in.
 *
 * @param {{ user_id: string, provider: string, provider_id: string | null,
 *   identity_data: Record<string, unknown> | null, created_at: Date | string | null }} row
 */
export function mapIdentityAccount(row) {
  const providerId = PROVIDER_MAP[/** @type {keyof typeof PROVIDER_MAP} */ (row.provider)];
  if (!providerId) return null;
  const accountId = firstString(
    row.provider_id,
    row.identity_data?.sub,
    row.identity_data?.provider_id,
  );
  if (!accountId) return null;
  return {
    account_id: accountId,
    provider_id: providerId,
    user_id: row.user_id,
    created_at: row.created_at ?? new Date(0),
    updated_at: row.created_at ?? new Date(0),
  };
}
