## Why

Users who host their JSON Resume online (on personal sites, GitHub Pages, or other hosting) need a way to import it into Resumind without downloading and re-uploading a file. The JSON Resume Registry (`registry.jsonresume.org`) and JSON Resume Schema (`jsonresume.org/schema`) are reference points for the standard, but they are not raw JSON endpoints with a different URL structure. A generic URL import covers any hosting scenario.

## What Changes

- Add URL import capability supporting any publicly accessible HTTPS URL returning JSON Resume data
- Proxy URL fetches through the API to bypass CORS restrictions
- Validate fetched content is valid JSON Resume via schema validation before proceeding
- Reference JSON Resume schema in the UI to clarify the data format (without implying registry.jsonresume.org is a direct JSON endpoint)
- Maintain existing file upload and JSON editor as alternative import paths

## Capabilities

### New Capabilities

- `jsonresume-url-import`: Import a JSON Resume by fetching JSON via the API proxy from any public URL

### Modified Capabilities

- `cv-json-import`: Extend the existing import UI to also accept a URL alongside file upload and JSON editor

## Impact

- **UI**: New-CV page import section gains URL input option alongside existing file upload
- **API**: New `POST /cv/import-from-url` endpoint that fetches remote JSON, validates it, and returns normalized data
- **Packages**: `@resumind/types` `prepareImportedResume` reused for URL-fetched content normalization
