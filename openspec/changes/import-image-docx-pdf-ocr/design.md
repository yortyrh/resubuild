> Retroactive design notes for work already implemented in the working tree.

## Context

File import at `/dashboard/cv/new/import/file` already supported JSON (local validation), PDF, and Markdown (agent jobs). PDF extraction used `pdf-parse` only; scanned PDFs failed fast. Word import was explicitly deferred in `cv-create-import-routes`. Job application preparation already transcribed image postings with a vision LLM.

## Goals / Non-Goals

**Goals:**

- Support scanned PDFs, résumé images, and `.docx` files on the unified file import route.
- Reuse `runTextImportWorkflow` after extraction/transcription for all non-JSON formats.
- Keep preview-then-create semantics unchanged.

**Non-Goals:**

- Legacy `.doc` (binary Word) support.
- Server-side Tesseract or non-LLM OCR.
- OCR for PDFs when the user has no LLM configuration (same gate as PDF import today).

## Decisions

### 1. Vision OCR for PDFs without a text layer

**Choice:** When `pdf-parse` returns empty text or throws, render up to 10 pages with `pdfjs-dist` + `@napi-rs/canvas`, then call the user's configured Mastra model with page images (same multimodal pattern as job image transcription).

**Alternatives considered:** Fail with user-facing error (rejected—blocks common scanned résumés); Tesseract (rejected—extra native dep and lower quality on complex layouts).

### 2. Image résumé import

**Choice:** `POST /cv/import/image` accepts PNG/JPEG/WebP; `runImageImportWorkflow` transcribes via `transcribeImageResumeTool` then delegates to `runTextImportWorkflow`.

**Alternatives considered:** Treat images as PDF pages (rejected—unnecessary conversion).

### 3. DOCX import

**Choice:** `mammoth.extractRawText` in `extractDocxTextTool`; synchronous extraction in the API handler before enqueueing the existing text job (same pattern as reading Markdown UTF-8).

**Alternatives considered:** Agent-only parsing (rejected—DOCX is structured text; deterministic extraction is faster and cheaper).

### 4. API surface

**Choice:** Separate endpoints `POST /cv/import/image` and `POST /cv/import/docx` with the same auth, LLM config gate, job store, and `GET /cv/import/:jobId` polling as PDF/Markdown.

## Risks / Trade-offs

- **Vision model cost/latency** for multi-page scanned PDFs → Mitigation: cap at 10 pages; single batched vision call per PDF.
- **Non-vision models** → OCR/image import fails with model error; user must pick a vision-capable model in AI agent settings.

## E2E test impact

See `tasks.md` — no new E2E scenarios in this change; existing import job endpoints unchanged for PDF/Markdown regression.
