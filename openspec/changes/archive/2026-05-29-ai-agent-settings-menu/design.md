## Context

Today Resumind stores one LLM configuration per user in `public.import_llm_config` (`model_id`, encrypted API key). The Nest `ImportLlmConfigModule` exposes `/import/llm/*` endpoints and probes keys via a minimal Mastra `Agent.generate`. The web app renders `ImportLlmSettingsForm` at `/dashboard/settings/import-llm` and links to it from PDF import when unconfigured. The dashboard header exposes only a standalone **Sign out** button.

Upcoming features (`prepare-job-application`, chat-driven tailoring) will reuse the same Mastra stack. Users expect to register credentials for providers they already pay for (Anthropic, OpenAI, Google, gateways) and switch between them without re-entering keys on every feature.

Constraints:

- API keys MUST remain encrypted at rest (`IMPORT_LLM_CONFIG_ENCRYPTION_KEY` or renamed env).
- Mastra model ids MUST stay in `provider/model` or `gateway/provider/model` form per `@resumind/import-models`.
- RLS: users only access their own rows.
- Cursor IDE subscription does not expose a user API key; v1 is **BYOK API keys** only.

## Goals / Non-Goals

**Goals:**

- Top-right **user menu** (avatar or account trigger) with **AI agent settings** + **Sign out**.
- **Multiple accounts** per user with optional label, provider, model, encrypted key.
- Exactly one **active account** per user used by all Mastra agent entry points.
- Expanded provider catalog (Anthropic, OpenAI, Google, OpenRouter minimum).
- Migrate existing `import_llm_config` rows into the first account + set active.
- Clear UX copy: “Bring your own API key from providers you subscribe to.”

**Non-Goals:**

- OAuth or session hijacking for Cursor Pro / ChatGPT Plus (no stable public API).
- Per-feature different active accounts (one global active account for v1).
- Storing non-API-key auth (cookies, refresh tokens).
- Changing Mastra agent business logic beyond credential resolution.

## Decisions

### 1. Data model: accounts + preference row

**Choice:** Two tables:

- `ai_agent_account`: `id` (uuid PK), `user_id`, `label` (text, optional), `provider_id` (text), `model_id` (text), `api_key_encrypted` (text), `created_at`, `updated_at`. Multiple rows per user; unique optional constraint on `(user_id, label)` when label present.
- `ai_agent_preference`: `user_id` (PK), `active_account_id` (uuid FK → `ai_agent_account`, ON DELETE SET NULL), `updated_at`.

**Rationale:** Separates credential blobs from “which one is selected”; deleting an account can null the preference without losing other accounts.

**Alternatives considered:**

- Single table with `is_active` boolean — harder to enforce exactly-one-active in Postgres without triggers.
- Keep `import_llm_config` and add `ai_agent_account` — duplicate sources of truth.

### 2. API surface: `/ai/agents/*` with legacy aliases

**Choice:** New Nest module `AiAgentModule`:

| Method | Path                              | Purpose                                    |
| ------ | --------------------------------- | ------------------------------------------ |
| GET    | `/ai/agents/providers`            | Catalog list                               |
| GET    | `/ai/agents/providers/:id/models` | Models for provider                        |
| GET    | `/ai/agents/accounts`             | List accounts (no raw keys)                |
| POST   | `/ai/agents/accounts`             | Create account (probe key)                 |
| PATCH  | `/ai/agents/accounts/:id`         | Update label/model/key                     |
| DELETE | `/ai/agents/accounts/:id`         | Remove account                             |
| GET    | `/ai/agents/active`               | Active account summary + `configured` flag |
| PUT    | `/ai/agents/active`               | Set active by `accountId`                  |

Keep `/import/llm/*` as thin wrappers delegating to `AiAgentModule` for one cycle (log deprecation).

**Rationale:** Names reflect product-wide AI usage, not PDF-only.

### 3. Credential resolution for agents

**Choice:** `AiAgentCredentialService.getActiveCredentials(user)` returns `{ modelId, apiKey }` or throws `422` with actionable message. `ImportService`, PDF import, and future application workflows inject this service instead of `ImportLlmConfigRepository`.

**Rationale:** Single resolution path; import module stops owning persistence.

### 4. Provider catalog expansion

**Choice:** Extend `packages/import-models/catalog.json`:

- Keep **anthropic**, **openai**, **google**.
- Add **openrouter** gateway with representative models (Claude, GPT, Gemini via gateway prefix).
- Label OpenAI models to include Codex-class names where catalog lists them (e.g. `openai/gpt-4.1` or codex-mini if available in Mastra registry).
- Document in UI help: “Cursor subscription” → use direct Anthropic/OpenAI key or OpenRouter key; no Cursor-specific integration in v1.

**Rationale:** Mastra already supports gateway-prefixed ids; OpenRouter covers “other popular” routing without N integrations.

### 5. User menu component

**Choice:** shadcn `DropdownMenu` triggered by a user icon button in the dashboard header (top-right). Items:

1. **AI agent settings** → `/dashboard/settings/ai-agent`
2. Separator
3. **Sign out** (existing logout behavior)

Remove standalone `SignOutButton` from header; reuse handler inside menu item.

**Rationale:** Matches user request; scales for future items (profile, billing).

### 6. Settings page UX

**Choice:** Two-panel or stacked layout:

- **Accounts list**: label, provider, model, “Active” badge, actions (Set active, Edit, Delete).
- **Add / edit form** (dialog or inline): provider → model → API key → optional label → Save (runs probe).

Show banner when no active account or probe failed / encryption rotation (`reconfigurationRequired` pattern preserved).

Redirect `/dashboard/settings/import-llm` → `/dashboard/settings/ai-agent`.

### 7. Migration

**Choice:** SQL migration:

1. Create new tables + RLS mirroring `import_llm_config` policies.
2. `INSERT INTO ai_agent_account ... SELECT ... FROM import_llm_config` with label `'Default'`.
3. `INSERT INTO ai_agent_preference` pointing at migrated account.
4. Drop `import_llm_config` in same migration after code deploy, or keep read-only fallback one release (prefer drop after dual-write verification in dev).

**Rationale:** Zero user friction for existing PDF import users.

## Risks / Trade-offs

- **[Users expect Cursor subscription login]** → Mitigation: honest copy + link to provider docs for API keys; OpenRouter as alternative.
- **[Multiple accounts same provider]** → Mitigation: allow duplicate provider_id with different labels/keys; active selection disambiguates.
- **[Breaking API clients on `/import/llm/*`]`** → Mitigation: alias routes + update web app only in same PR.
- **[Encryption key rotation]** → Mitigation: reuse existing `reconfigurationRequired` status on accounts that fail decrypt.
- **[Catalog drift from Mastra]** → Mitigation: keep pinned JSON catalog versioned in `@resumind/import-models`; periodic manual updates.

## Migration Plan

1. Ship DB migration + API module with legacy aliases.
2. Deploy API; verify migration backfill in staging.
3. Ship web user menu + new settings page; redirect old route.
4. Remove deprecated `ImportLlmConfig*` code after alias period (optional follow-up change).
5. Rollback: restore `import_llm_config` from backup if needed; feature flag not required for v1.

## Open Questions

- Should account labels be required when user has more than one account? (Recommend: optional, default to provider display name.)
- Rename env `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` → `AI_AGENT_ENCRYPTION_KEY` with fallback read? (Recommend: accept both in ConfigService for zero deploy friction.)
