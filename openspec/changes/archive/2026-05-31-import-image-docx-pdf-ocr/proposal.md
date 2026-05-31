> This change retroactively documents work already implemented in the working tree.

## Why

Users frequently upload résumés that are not plain text: scanned PDFs with no text layer, Word documents (`.docx`), and PNG/JPEG/WebP screenshots. The file import route rejected or failed these formats—scanned PDFs surfaced **"No extractable text found in PDF"** even though the AI agent could transcribe page images—and Word and image files were not supported at all.

## What Changes

- **PDF OCR fallback**: When `pdf-parse` yields no text (or throws), render PDF pages to PNG and transcribe with the user's vision-capable LLM before running the existing text import workflow.
- **Image import**: Add `POST /cv/import/image` (PNG/JPEG/WebP, max 5 MB) and `runImageImportWorkflow` that transcribes the image then reuses `runTextImportWorkflow`.
- **DOCX import**: Add `POST /cv/import/docx` (max 5 MB) using `mammoth` text extraction, then `runTextImportWorkflow`.
- **Web file import UI**: Extend **Import from file** to accept Word and image formats; route uploads to the correct API endpoints; update copy and validation messages.
- **Prepare-application parity**: Pass LLM credentials into PDF text extraction so job-posting PDF intake can also OCR scanned documents.

## Capabilities

### New Capabilities

- `cv-image-import`: Server and client behavior for uploading a résumé image, vision transcription, and preview-then-create flow.
- `cv-docx-import`: Server and client behavior for uploading a Word résumé, text extraction, and preview-then-create flow.

### Modified Capabilities

- `cv-pdf-import`: Scanned/image-only PDFs SHALL succeed via vision OCR when a vision-capable model is configured; hard failure only when OCR also fails.
- `cv-rest-api`: New `POST /cv/import/image` and `POST /cv/import/docx` async job endpoints; extend job polling semantics to cover image and DOCX success.
- `import-preview-ui`: File import form accepts Word and image formats with the same Import → Preview/Edit → Save flow as PDF and Markdown.
- `resume-import-agent`: New tools (`renderPdfPagesToPng`, `transcribePdfWithVision`, `transcribeImageResume`, `extractDocxText`); `runImageImportWorkflow`; OCR-aware `extractPdfTextTool`.
- `web-application`: File import page copy lists Word and image formats.

## Impact

- **apps/import-agent**: `pdfjs-dist`, `@napi-rs/canvas`, `mammoth`; new tools and `runImageImportWorkflow`.
- **apps/api**: `ImportController` / `ImportService` image and DOCX handlers; unit tests.
- **apps/web**: `import-file-kind`, `import-file-form`, `api.ts` client helpers.
- **Dependencies**: Vision-capable LLM required for PDF OCR and image import; DOCX uses deterministic extraction only.
