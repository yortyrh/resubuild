# Non-functional requirements (`NFR`)

### REQ-NFR-001 Accessibility `[nfr]`

- UI text and controls meet WCAG 2.1 AA contrast in both light and dark color schemes.
- Every interactive element has a visible focus indicator and an accessible name.
- Every action that uses drag-and-drop has a keyboard alternative.
- Decorative graphics are hidden from assistive technology.
- Animations respect `prefers-reduced-motion`.

### REQ-NFR-002 Secrets stay on the server `[nfr]`

The browser bundle never contains server credentials (database, object storage, mail, session-signing, encryption or provider keys) and never talks to the database or object storage directly. User-provided API keys (AI, MCP) are stored encrypted or hashed and are never sent back in plain text.

### REQ-NFR-003 Safe rendering `[nfr]`

Every user-authored Markdown/HTML is sanitized before it is rendered in the app or in exports.

### REQ-NFR-004 Bounded inputs and AI work `[nfr]`

Every upload and fetched URL has a size limit and a timeout. AI pipelines have bounded retries and bounded web searches, so a single job cannot run without limit.

- App-funded AI spend is bounded by monthly token budgets per model and per user (REQ-IMP-010).

### REQ-NFR-005 Open data `[nfr]`

User data can always be exported as standard JSON Resume (REQ-EXP-007). That export can be imported again without loss of content (REQ-IMP-005).

### REQ-NFR-006 Self-hostable `[nfr]`

The whole product runs from the repository's container setup (web, API, database, object storage), configured only through environment variables. It depends only on standard interfaces: any PostgreSQL server, any S3-compatible object store and any SMTP server (or the Resend HTTPS API where outbound SMTP is blocked); no hosted backend service is required. Optional integrations (social sign-in, AI, scraping, MCP) degrade gracefully when they are not configured.

- Local development runs every backing service in containers, including a mail catcher that shows every email the app sends.
- Schema changes ship as versioned migrations that run before the API starts.
- Data from a previous deployment on a hosted backend can be migrated with the same user ids, so accounts and their data stay linked.
