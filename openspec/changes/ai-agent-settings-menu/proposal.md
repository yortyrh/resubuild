## Why

Resumind’s AI features (PDF import today; Prepare Application and other Mastra workflows soon) depend on per-user LLM credentials, but configuration is buried on a PDF-import-specific settings page and only supports a single provider/model/key combo. Users who already pay for Claude, OpenAI (Codex/GPT), Google Gemini, or gateway subscriptions need a first-class place to register multiple provider accounts, pick which credential is active, and reach settings from anywhere in the app—not only when blocked on PDF import.

## What Changes

- Add a **top-right user menu** in the dashboard header replacing the standalone Sign out button; menu items include **AI agent settings** and **Sign out**.
- Replace the import-only settings surface with a generalized **AI agent configuration** page reachable from the user menu (keep a redirect from the old import-llm path for bookmarks).
- Support **multiple saved AI accounts** per user (nickname + provider + model + encrypted API key), with exactly one **active account** whose key/model Mastra workflows use.
- Expand the pinned provider catalog to cover popular agentic stacks: **Anthropic (Claude)**, **OpenAI (GPT/Codex-class models)**, **Google (Gemini)**, **OpenRouter** (multi-provider gateway), and room for additional Mastra-compatible providers without UI rewrites.
- Improve settings UX: account list with add/edit/delete, provider-first model picker, masked keys, validation probe on save, clear “active account” indicator, and copy explaining BYOK vs subscription (API keys only in v1).
- **Migrate** existing `import_llm_config` single-row data into the new accounts model without user re-entry when possible.
- Update PDF import and future AI gates to require an **active, valid AI account** instead of “import LLM config” wording in UI.
- **BREAKING (API paths, aliased):** Introduce `/ai/agents/*` REST routes; keep `/import/llm/*` as deprecated aliases for one release cycle or proxy to the new module.

## Capabilities

### New Capabilities

- `ai-agent-accounts`: Multi-account storage, active selection, provider catalog exposure, encrypted credential persistence, API key probe, and resolution of the active Mastra model + key for agent runs.

### Modified Capabilities

- `import-llm-config`: Requirements reframed as a consumer of the active AI agent account (PDF import gated on active account, not a separate config domain).
- `web-application`: Dashboard header user menu; AI settings route and navigation; updated setup prompts on import/AI flows.
- `database-cv-rls`: New `ai_agent_account` and `ai_agent_preference` (or equivalent) tables with RLS; migration from `import_llm_config`.
- `cv-pdf-import`: Setup prompts and API errors reference active AI agent account instead of import-only settings.
- `resume-import-agent`: Agent runs resolve credentials from the user’s active account abstraction.

## Impact

- **Database**: Supabase migration(s) for multi-account schema; optional deprecation of `import_llm_config` after data migration.
- **apps/api**: New or refactored `AiAgentModule` (accounts CRUD, set active, catalog); `ImportLlmConfigModule` thinned to delegate or deprecated routes; `ImportService` and future application agents read active account.
- **packages/import-models**: Rename or extend catalog for additional providers/gateways (OpenRouter, model labels for Codex-class OpenAI models); shared validation helpers.
- **apps/web**: `UserMenu` dropdown in `dashboard/layout.tsx`; new `/dashboard/settings/ai-agent` page; refactor `ImportLlmSettingsForm` → `AiAgentSettings`; update PDF import prompts and links.
- **openspec/specs/**: Deltas for capabilities above; `prepare-job-application` and `react-query-adoption` depend on this change for shared AI credential resolution.
- **Out of scope**: OAuth login to Cursor/ChatGPT subscriptions (no public BYOK API); server-side billing; org/shared team keys; model fine-tuning.

## Dependencies

- None (foundational AI config change). Should land before **`prepare-job-application`** and ideally before **`react-query-adoption`** (so hooks target `/ai/agents/*`).
