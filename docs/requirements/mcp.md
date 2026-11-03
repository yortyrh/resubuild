# MCP server (`MCP`)

### REQ-MCP-001 MCP endpoint `[optional]`

The API exposes a Model Context Protocol server, so external AI clients can manage a user's CVs. A deployment flag can disable it; when disabled, the MCP endpoint returns 404 and the rest of the app is unaffected.

### REQ-MCP-002 Per-user API key

MCP requests authenticate with a personal MCP API key, not with a web session token.

- Each user has at most one active key. Creating a key when one already exists rotates it atomically, and the old key stops working immediately.
- Only a hash of the key is used to authenticate requests, and the time of each key's last use is recorded.
- The settings page shows "Create API key" when the user has no key and "Rotate key" when one exists. Rotation asks for a destructive-style confirmation.
- The user can revoke the key. A revoked or invalid key gets 401.
- The settings page lists the tools that are actually registered.

### REQ-MCP-003 Tool catalog

The public tool names are an external contract:
`list_cvs`, `get_cv`, `delete_cv`, `create_cv_from_jsonresume`, `replace_cv_from_jsonresume`, `get_jsonresume_schema`, `export_cv_jsonresume`, `export_cv_html`, `export_cv_screenshot`, `export_cv_pdf`, `fetch_export_url`, `list_cv_designs`, `get_cv_template_presentation`, `update_cv_template_presentation`, `list_applications`, `get_application`, `update_application`, `update_application_letter`, `list_media`, `get_media_url`, `delete_media`.

- Tools are annotated as read-only or destructive.
- AI-settings, web-search, scraping, import and preparation tools are deliberately **not** exposed.
- `get_jsonresume_schema` returns the bundled JSON Resume schema.

### REQ-MCP-004 Resources and exported artifacts

The server exposes CVs, applications and media as resources, addressed by id. Exported files (HTML, PDF, screenshot, JSON) are returned as short-lived download URLs with their content type.
