## 1. Database and catalog

- [ ] 1.1 Add Supabase migration `supabase/migrations/*_ai_agent_accounts.sql` creating `ai_agent_account`, `ai_agent_preference`, RLS policies, and backfill from `import_llm_config`; drop or deprecate `import_llm_config` after backfill
- [ ] 1.2 Extend `packages/import-models/catalog.json` with **openrouter** gateway and Codex/GPT-class OpenAI model entries; update `packages/import-models/src/index.test.ts` for new providers
- [ ] 1.3 Document BYOK vs subscription limits in catalog provider `displayName` / API README snippet (no Cursor OAuth)

## 2. API — AI agent module

- [ ] 2.1 Create `apps/api/src/ai-agent/` module: DTOs, `AiAgentRepository`, `AiAgentCredentialService`, `AiAgentService`, `AiAgentController` with routes under `/ai/agents/*`
- [ ] 2.2 Move or reuse encryption helpers from `import-llm-crypto.util.ts` (support `AI_AGENT_ENCRYPTION_KEY` with fallback to `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`)
- [ ] 2.3 Implement account CRUD, active selection, catalog list endpoints, and Mastra key probe on save (mirror existing probe behavior)
- [ ] 2.4 Add colocated tests: `ai-agent.controller.spec.ts`, `ai-agent.repository.spec.ts`, `ai-agent-credential.service.spec.ts`
- [ ] 2.5 Wire `AiAgentModule` in `app.module.ts`; refactor `ImportService` to inject `AiAgentCredentialService` instead of `ImportLlmConfigRepository`
- [ ] 2.6 Keep `/import/llm/*` as deprecated delegating wrappers in `ImportLlmConfigController` (or proxy controller) for backward compatibility

## 3. API — cleanup import LLM module

- [ ] 3.1 Remove direct reads of `import_llm_config` from `ImportLlmConfigRepository` once migration verified; thin module to aliases only or delete after web migration
- [ ] 3.2 Update `apps/api/src/import/import.service.ts` error messages to “AI agent configuration” wording
- [ ] 3.3 Update import e2e/unit tests referencing import LLM config paths and mocks

## 4. Web — user menu and routing

- [ ] 4.1 Add shadcn `DropdownMenu` user menu component at `apps/web/src/components/dashboard/user-menu.tsx` with AI settings link + Sign out
- [ ] 4.2 Replace `SignOutButton` in `apps/web/src/app/dashboard/layout.tsx` with `UserMenu`
- [ ] 4.3 Add `apps/web/src/app/dashboard/settings/ai-agent/page.tsx`; redirect `/dashboard/settings/import-llm` → `/dashboard/settings/ai-agent` via `next.config` redirect or page re-export
- [ ] 4.4 Add colocated test `user-menu.test.tsx` for menu actions (mock router and logout)

## 5. Web — AI agent settings UI

- [ ] 5.1 Add API client functions in `apps/web/src/lib/api.ts` for `/ai/agents/*` (accounts list, create, update, delete, active, providers, models)
- [ ] 5.2 Create `apps/web/src/components/settings/ai-agent-settings.tsx` — account list, active badge, add/edit dialog, delete confirm, provider → model → key flow
- [ ] 5.3 Refactor or replace `import-llm-settings-form.tsx`; migrate tests to `ai-agent-settings.test.tsx`
- [ ] 5.4 Update PDF import setup prompts in `import-pdf-cv-form.tsx` (and related) to link to AI agent settings / user menu copy

## 6. Verification

- [ ] 6.1 Run `pnpm --filter @resumind/api test -- --run` and `pnpm --filter @resumind/web test -- --run`
- [ ] 6.2 Run `pnpm --filter @resumind/api typecheck` and `pnpm --filter @resumind/web typecheck`
- [ ] 6.3 Manual smoke: add two accounts (e.g. Anthropic + OpenAI), switch active, run PDF import with each; sign out from user menu

## E2E test impact

- **Update required** — E2E flows that configure PDF import via `/dashboard/settings/import-llm` MUST follow redirect to `/dashboard/settings/ai-agent` and use multi-account UI (or API seed of active account). Update selectors/copy from “import LLM” to “AI agent”.
- **Must pass unchanged** — Auth, CV CRUD, JSON import, and non-AI dashboard flows after path/selector updates only.
- **Add recommended** — E2E scenario: open user menu → AI settings → save active account → PDF import succeeds.
