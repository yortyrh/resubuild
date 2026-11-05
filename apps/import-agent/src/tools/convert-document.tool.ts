import { type ConvertErrorCode, type Format, toMarkdownBytes } from '@firecrawl/anydoc';

export type ConvertibleDocumentFormat = 'pdf' | 'docx';

export interface ConvertDocumentOptions {
  /**
   * Firecrawl key for hosted OCR. Documents anydoc reads locally never leave
   * the machine; only PDFs with scanned/image-only pages go to Firecrawl Parse
   * (keyless, with lower limits, when no key is set).
   */
  firecrawlApiKey?: string;
}

/** anydoc rejection, with the `code` it reports (`needsOcr`, `encrypted`, `hosted`, …). */
export class DocumentConversionError extends Error {
  constructor(
    readonly code: ConvertErrorCode | 'empty' | 'unknown',
    message: string,
    readonly pageCount?: number,
  ) {
    super(message);
    this.name = 'DocumentConversionError';
  }
}

const ERROR_MESSAGES: Partial<Record<DocumentConversionError['code'], string>> = {
  encrypted: 'The document is password-protected. Remove the password and try again.',
  unsupported: 'This document format could not be read.',
  malformed: 'The document is damaged or has no readable content.',
  missingPart: 'The document is damaged or has no readable content.',
  resourceLimit: 'The document is too complex to read.',
  hosted: 'Could not read the scanned pages of this document.',
  empty: 'No extractable text found in the document.',
};

/**
 * Convert a PDF or Word document to GitHub-flavored Markdown with anydoc
 * (local, native). Scanned PDF pages use anydoc's hosted OCR.
 */
export async function convertDocumentToMarkdown(
  buffer: Buffer,
  format: ConvertibleDocumentFormat,
  options: ConvertDocumentOptions = {},
): Promise<string> {
  let markdown: string;
  try {
    // `Format` is a const enum whose values are these strings.
    markdown = await toMarkdownBytes(new Uint8Array(buffer), format as Format, {
      ocr: 'hosted',
      ...(options.firecrawlApiKey?.trim() ? { apiKey: options.firecrawlApiKey.trim() } : {}),
    });
  } catch (error) {
    const code = ((error as { code?: string })?.code ??
      'unknown') as DocumentConversionError['code'];
    const pageCount = (error as { pageCount?: unknown })?.pageCount;
    const detail = error instanceof Error ? error.message : String(error);
    throw new DocumentConversionError(
      code,
      ERROR_MESSAGES[code] ?? `Could not read the document: ${detail}`,
      typeof pageCount === 'number' ? pageCount : undefined,
    );
  }

  const text = markdown.trim();
  if (!text) {
    throw new DocumentConversionError('empty', ERROR_MESSAGES.empty!);
  }
  return text;
}
