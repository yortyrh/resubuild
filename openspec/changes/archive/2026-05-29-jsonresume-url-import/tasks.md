## 1. API Endpoint

- [x] 1.1 Add `POST /cv/import-from-url` endpoint in `apps/api/src/import/`
- [x] 1.2 Implement URL validation (HTTPS only, reject private IP ranges: localhost, 10.x, 192.168.x, 172.16-31.x, 127.x)
- [x] 1.3 Implement server-side fetch with size limit (e.g., 5MB) and timeout (10s)
- [x] 1.4 Validate Content-Type is application/json or text/plain
- [x] 1.5 Call `prepareImportedResume` and JSON Resume schema validation
- [x] 1.6 Return normalized data on success, 400 with schema errors on failure

## 2. UI - Add URL Import Input

- [x] 2.1 Add URL input field to `ImportCvForm` above the file upload section
- [x] 2.2 Call `POST /cv/import-from-url` on submit instead of parsing locally
- [x] 2.3 Add hint text referencing `jsonresume.org/schema` and explaining any publicly hosted HTTPS JSON Resume URL can be imported
- [x] 2.4 Handle API error responses with inline error display

## 3. Tests

- [x] 3.1 Add unit tests for URL validation (accept HTTPS, reject private URLs, reject non-HTTPS)
- [x] 3.2 Add unit tests for SSRF protection
- [x] 3.3 Add unit tests for JSON Content-Type validation
- [ ] 3.4 Update `new-cv-page-client.test.tsx` if needed

## 4. E2E Test Impact

Add required: Add E2E scenario for URL import in the new-CV page flow per `openspec/specs/e2e-testing/spec.md`.
