# Import and AI settings (`IMP`)

### REQ-IMP-001 New CV options

A user can create a CV from scratch, import it from a file, or import it from a URL.

### REQ-IMP-002 Preview before create

No import creates a CV automatically. Every import produces a schema-valid draft, which the user can **Preview** (rendered with a template) and **Edit** (raw JSON) before pressing **Save**.

- The primary action is **Import** until a valid draft exists, then **Save**. Progress is shown while the import runs.
- AI-processed imports report success in a notification and mention when social profiles were found online.

### REQ-IMP-003 File import

Import from file accepts JSON Resume (`.json`), PDF, Markdown, Word (`.docx`), and images (PNG, JPEG, WebP). The format is detected automatically.

- JSON is validated and normalized locally and needs no AI.
- Every other format runs as a background AI job that the client follows until it succeeds or fails.
- PDF and Word files are converted to Markdown on the server (headings, lists, tables and links kept). Only PDFs with scanned or image-only pages are sent to a hosted OCR service. The links behind icons or labels in a PDF (for example a "LinkedIn" icon) are kept with their URLs. If the document still yields no text, the user's vision model transcribes the pages as a last resort. Password-protected files fail with a clear error.
- Size limits are enforced before upload (for example about 1 MB for JSON and 5 MB for PDF), with a clear error.

### REQ-IMP-004 URL import

Import from URL accepts a direct JSON Resume URL (imported without AI) or a web page (AI job).

- Invalid URLs are rejected without starting a job.
- Page content is extracted as Markdown with the deployment's page-extraction providers when configured (REQ-IMP-009), otherwise from the raw page.

### REQ-IMP-005 JSON Resume normalization

External JSON Resume documents are normalized before creation: ids are stripped and missing sections are filled. An exported document can be re-imported without manual edits (round-trip; see REQ-EXP-007).

### REQ-IMP-006 AI import pipeline

AI imports extract the text (or transcribe an image with a vision-capable model), draft a JSON Resume, then run a verify-and-repair loop: schema validation and date normalization. The loop spends no web searches; URL imports may search the web only when the agent asks for it.

- The loop has a bounded number of retries (default 3). If it is exceeded, the job fails with all collected errors.
- Job status reports the current step (extracting, drafting, verifying, repairing, …) while the job runs. A failed job no longer reports an in-progress step; it reports the step that was running when it failed.
- Long résumés must not fail because the model's reply was cut off or slightly malformed: drafts request structured output and the model's full output budget, and malformed JSON is repaired before the job gives up.
- The pipeline uses the user's own model and API key, never a deployment-wide default.

### REQ-IMP-007 Social profile discovery

When a web search provider is configured (REQ-IMP-009) and the draft has a name, the import searches the public web for the person's profiles on supported networks (LinkedIn, GitHub, X, and others) and merges valid ones into the draft without overwriting existing profiles.

- Search is bounded per job: at most 5 queries of up to 3 results each, and the search for a network stops once a profile is found.
- Merged profiles have a network, an HTTPS URL, and a username.

### REQ-IMP-008 AI provider settings

AI import and job-application preparation stay disabled until the user configures a provider, a model, and an API key. While unconfigured, the UI shows a setup link instead of the action.

- The flow is provider first, then model (chosen from a server-provided catalog, not free text), then API key. Labels name the expected key (for example "OpenAI API key").
- The key is validated before activation and stored encrypted. It is never returned in plain text.
- The model catalog can be refreshed from a public model registry, and only lists chat-capable models the runtime supports. It marks reasoning models.
- Each account can set the provider's model options: reasoning effort, extended thinking and its token budget, thinking level, reasoning summary, verbosity, service tier or speed, depending on the provider. Every option defaults to "provider default", which sends nothing so the provider's own default applies. Reasoning-only options are offered for reasoning models only. The key check on save sends the chosen options, so a combination the model rejects is reported then. Every AI workflow run on the account (import, application preparation) uses its options.
- The key is passed to the model call directly, never through the process environment, so concurrent jobs with different keys cannot mix them up.
- The label is optional. Without one, an account is shown as "Provider · Model" (for example "Anthropic · Claude Opus 4.5"); the dialog shows that default name and the user's other accounts. A second account for a model that already has an unlabeled account needs a label.
- The label and API key fields are never filled in by the browser or a password manager. When editing, the dialog states that a key is saved (or that it can no longer be read) and keeps it unless a new key is entered.
- The account list shows each account's provider logo, name, model and the options that are set.

### REQ-IMP-009 Web search and page-extraction providers

Web search and page extraction use deployment-wide providers configured in the server environment (Tavily, Firecrawl, Brave Search), shared by all users. Users do not configure scraping or search keys.

- Every provider with a key takes part. Search uses Brave, Tavily and Firecrawl; page extraction uses Firecrawl and Tavily.
- Calls rotate round-robin across the configured providers to spread spend. A failing provider hands the call to the next one; a provider that reports no credit, a rate limit or a rejected key is skipped for a cooldown period.
- Without providers, URL import falls back to raw page fetch, and web lookup and profile discovery are skipped without failing.

### REQ-IMP-010 Included AI (app-funded models)

A deployment can fund AI for signed-in users who have no API key of their own. The operator lists models in the server environment, each with its own key and a monthly token budget, and sets a monthly token allowance per user.

- Users with no account of their own use the included models by default. Users with accounts can switch between "Resubuild included AI" and their own accounts; the choice is kept.
- Runs rotate round-robin across the included models. A model that used its monthly budget is skipped; one whose key the provider rejects, bills out or rate-limits is skipped for a cooldown period.
- Every model call on included AI counts its input and output tokens against both the model's budget and the user's allowance. Counts reset at the start of each UTC month. A job can overshoot a budget by at most its own tokens.
- When the user's allowance is used up, new AI jobs are refused (HTTP 429) with the reset date and a pointer to adding their own key. When every included model used its budget, new jobs are refused (HTTP 503).
- AI settings show the included models, this month's usage against the allowance and the reset date. Calls with the user's own key are not counted.
