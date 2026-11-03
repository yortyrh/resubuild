# Product requirements

Living, tech-agnostic list of what Resubuild must do. It replaces the former OpenSpec specs.

## Rules

- A requirement describes **observable product behavior**. No library, vendor, table, route, or CSS names, unless the name itself is an external contract (e.g. JSON Resume, MCP tool names).
- Each requirement has a stable ID `REQ-<AREA>-NNN`. IDs are never reused; when a requirement is removed, delete it (git keeps the history).
- Edit in place. There are no change proposals, deltas, or archives. History is `git log -p docs/requirements`.
- When a change alters product behavior, update the matching requirement **in the same commit**.
- Keep entries short: a title, 1–3 lines of behavior, optional bullets for key acceptance criteria.
- Tags: `[optional]` = behind a deployment flag; `[nfr]` = non-functional.

## Areas

| File                               | Area   | Scope                                                      |
| ---------------------------------- | ------ | ---------------------------------------------------------- |
| [auth.md](auth.md)                 | `AUTH` | Accounts, sign-in methods, sessions, data isolation        |
| [cv.md](cv.md)                     | `CV`   | CV data model, persistence, validation, media              |
| [cv-editor.md](cv-editor.md)       | `EDIT` | Editing experience for a CV                                |
| [import.md](import.md)             | `IMP`  | Creating CVs from files, URLs and AI; AI provider settings |
| [export.md](export.md)             | `EXP`  | Templates, preview, HTML/PDF/JSON export                   |
| [applications.md](applications.md) | `APP`  | Job-application preparation (tailored CV + cover letter)   |
| [mcp.md](mcp.md)                   | `MCP`  | MCP server for external AI clients                         |
| [web.md](web.md)                   | `WEB`  | Public site, navigation, responsive layout, SEO            |
| [nfr.md](nfr.md)                   | `NFR`  | Cross-cutting non-functional requirements                  |
