export type McpExportKind = 'html' | 'pdf' | 'screenshot' | 'jsonresume';

export type McpExportScreenshotMode = 'first_page' | 'full_document';

export interface McpExportRecord {
  id: string;
  userId: string;
  cvId: string;
  kind: McpExportKind;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  filename: string;
  templateId: string | null;
  mode: McpExportScreenshotMode | null;
  createdAt: string;
  expiresAt: string;
}

/**
 * Wire envelope returned to MCP clients by the four `export_cv_*` tools and the
 * `fetch_export_url` refresh tool. Treat `url` as a bearer token until it expires.
 */
export interface McpExportEnvelope {
  exportId: string;
  url: string;
  expiresAt: string;
  expiresInSeconds: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: McpExportKind;
  templateId: string | null;
  mode?: McpExportScreenshotMode;
}

export interface McpExportUploadInput {
  userId: string;
  cvId: string;
  kind: McpExportKind;
  /** Raw artifact bytes. Use `Buffer` in Node, `Uint8Array` in edge runtimes. */
  buffer: Uint8Array;
  contentType: string;
  filename: string;
  templateId?: string | null;
  mode?: McpExportScreenshotMode | null;
}
