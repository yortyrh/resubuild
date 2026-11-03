# Non-functional requirements (`NFR`)

### REQ-NFR-001 Accessibility `[nfr]`

- UI text and controls meet WCAG 2.1 AA contrast in both light and dark color schemes.
- Every interactive element has a visible focus indicator and an accessible name.
- Every action that uses drag-and-drop has a keyboard alternative.
- Decorative graphics are hidden from assistive technology.
- Animations respect `prefers-reduced-motion`.

### REQ-NFR-002 Secrets stay on the server `[nfr]`

The browser bundle never contains server credentials (database, admin, encryption or provider keys). User-provided API keys (AI, scraping, MCP) are stored encrypted or hashed and are never sent back in plain text.

### REQ-NFR-003 Safe rendering `[nfr]`

Every user-authored Markdown/HTML is sanitized before it is rendered in the app or in exports.

### REQ-NFR-004 Bounded inputs and AI work `[nfr]`

Every upload and fetched URL has a size limit and a timeout. AI pipelines have bounded retries and bounded web searches, so a single job cannot run without limit.

### REQ-NFR-005 Open data `[nfr]`

User data can always be exported as standard JSON Resume (REQ-EXP-007). That export can be imported again without loss of content (REQ-IMP-005).

### REQ-NFR-006 Self-hostable `[nfr]`

The whole product runs from the repository's container setup (web, API, database), configured only through environment variables. Optional integrations (social sign-in, AI, scraping, MCP) degrade gracefully when they are not configured.
