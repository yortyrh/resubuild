## Context

The new-CV page has three import paths: PDF import, manual creation, and JSON import. The JSON import currently supports file upload and JSON editor. Users who host their resume online need a way to import it without downloading and re-uploading.

The JSON Resume Schema (`jsonresume.org/schema`) defines the standard format. The JSON Resume Registry (`registry.jsonresume.org`) is a registry product but is not a direct raw-JSON endpoint — users must understand its URL structure. A generic URL import is the clearest approach.

## Goals / Non-Goals

**Goals:**

- Accept any public URL that returns JSON Resume data
- Proxy fetches through the API CORS-free context
- Validate fetched content is valid JSON Resume before accepting
- Clearly credit JSON Resume resources in the UI
- Maintain file upload and JSON editor as alternative paths

**Non-Goals:**

- Not supporting non-JSON responses (HTML, PDF, etc.)
- Not changing the PDF import path
- Not persisting fetched URLs

## Decisions

1. **Server-side URL fetch via API**: New `POST /cv/import-from-url` endpoint that accepts a URL, fetches it server-side (bypassing CORS), validates it's JSON Resume data, normalizes it, and returns the prepared data to the client.

2. **URL validation**: Accept any HTTPS URL. Reject non-HTTPS, private ranges (localhost, 10.x, 192.168.x, etc.), and non-JSON responses via Content-Type check.

3. **JSON Resume schema validation in API**: The API validates the fetched JSON against the JSON Resume schema before returning. If invalid, return a 400 with validation errors.

4. **UX flow**: Existing file upload and JSON editor remain. A new "Import from URL" section is added to the JSON import tab with a URL input.

## Risks / Trade-offs

[Risk] SSRF via internal URLs → [Mitigation] Block private IP ranges, localhost, and internal network ranges in the API
[Risk] Large filefetch → [Mitigation] Enforce size limit and timeout in API fetch
[Risk] Non-JSON content-type → [Mitigation] Reject based on Content-Type header; fall back to JSON parse check
[Risk] Slow upstream servers → [Mitigation] Set reasonable timeout (10s) and fail fast
