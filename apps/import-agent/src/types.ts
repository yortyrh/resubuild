export type ImportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type ImportJobProgress =
  | 'extracting'
  | 'drafting'
  | 'verifying'
  | 'repairing'
  | 'finalizing';

export interface ImportJobResult {
  status: ImportJobStatus;
  progress?: ImportJobProgress;
  cvId?: string;
  errors?: string[];
}

export interface PdfImportWorkflowInput {
  pdfBuffer: Buffer;
  modelId: string;
  apiKey: string;
  searchApiKey?: string;
  onProgress?: (progress: ImportJobProgress) => void;
  finalize?: (draft: Record<string, unknown>) => Promise<string>;
  generateDraft?: (text: string) => Promise<Record<string, unknown>>;
  repairDraft?: (
    draft: Record<string, unknown>,
    errors: string[],
  ) => Promise<Record<string, unknown>>;
}

export interface PdfImportWorkflowResult {
  cvId?: string;
  draft?: Record<string, unknown>;
  errors: string[];
}

export interface ToolRegistry {
  extractPdfText: typeof import('./tools/extract-pdf-text.tool').extractPdfTextTool;
  validateResumeSchema: typeof import('./tools/validate-resume-schema.tool').validateResumeSchemaTool;
  normalizeDates: typeof import('./tools/normalize-dates.tool').normalizeDatesTool;
  webLookup: typeof import('./tools/web-lookup.tool').webLookupTool;
}
