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
- The model catalog can be refreshed from a public model registry, and only lists chat-capable models the runtime supports.

### REQ-IMP-009 Web search and page-extraction providers

Web search and page extraction use deployment-wide providers configured in the server environment (Tavily, Firecrawl, Brave Search), shared by all users. Users do not configure scraping or search keys.

- Every provider with a key takes part. Search uses Brave, Tavily and Firecrawl; page extraction uses Firecrawl and Tavily.
- Calls rotate round-robin across the configured providers to spread spend. A failing provider hands the call to the next one; a provider that reports no credit, a rate limit or a rejected key is skipped for a cooldown period.
- Without providers, URL import falls back to raw page fetch, and web lookup and profile discovery are skipped without failing.
