# Job applications (`APP`)

### REQ-APP-001 Prepare application intake

A signed-in user with configured AI settings (REQ-IMP-008) can prepare an application from exactly one job-posting source plus an optional instruction message. The source can be an HTTPS URL, plain text, a PDF (max 5 MB), or a screenshot (PNG/JPEG/WebP, max 5 MB).

- The base CV defaults to AI selection. The user may pick a specific CV instead.
- Preparation runs as a background job with visible progress. It is rejected when AI settings are missing.

### REQ-APP-002 Base CV selection

When the user did not pick a base CV, the AI chooses the best-matching CV from the user's library. The rationale for the choice is saved and shown to the user.

### REQ-APP-003 Tailored CV

The selected CV is cloned (REQ-CV-010) and only the clone is tailored. Tailoring adjusts the label, emphasizes relevant content, and drops irrelevant bullets. The source CV is never modified. Every change must still pass schema validation.

### REQ-APP-004 Clones stay out of the library

Tailored clones do not appear in the CV library. They are reachable from the application workspace or by direct link.

### REQ-APP-005 Promote tailored CV

The user can promote a tailored CV. Promotion creates a new library CV copied from the clone and linked to it. The clone itself stays hidden.

### REQ-APP-006 Cover letter

The AI drafts a Markdown cover letter from the job summary and the tailored CV. It is written in the language of the job posting, unless the user's message asks for another language.

- The user can edit the letter manually, without AI.
- One copy action places rich text on the clipboard, with a plain-text fallback, so formatting survives pasting into email.
- The letter can be printed and exported as PDF (REQ-EXP-008).

### REQ-APP-007 Application list

The user can list past applications, newest first, with job title, company, status, and dates, and reopen any of them. Hidden replacement drafts and failed staging records are not listed.

### REQ-APP-008 Workspace

The application workspace has three tabs, in this order: Job summary, Tailored CV, Cover letter.

- The header shows the company as the heading and the position as the subtitle.
- The Tailored CV tab embeds the standard CV editor for the clone. It can show the original Work, Volunteer, and Project entries side by side, read-only.
- The last selected tab is remembered for the browser session.
- Print output excludes the app chrome.

### REQ-APP-009 Base CV snapshot

The base CV used for tailoring is saved as a snapshot, so regenerating works even if the original CV is later deleted. The UI shows when the base is a saved copy.

### REQ-APP-010 Safe update

Updating an application builds a hidden replacement while the current version stays active and listed.

- On success, the replacement takes over atomically and the old version is removed.
- On failure or timeout, the original stays untouched.
- At most one pending replacement exists per application.
