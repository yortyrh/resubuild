import { convertDocumentToMarkdown, DocumentConversionError } from './convert-document.tool';
import { appendPdfLinks, extractPdfLinks, type PdfLink } from './extract-pdf-links';
import { transcribePdfWithVisionTool } from './transcribe-pdf-with-vision.tool';

export interface ExtractPdfTextResult {
  text: string;
  /** Known when the vision fallback ran or anydoc reported it; otherwise undefined. */
  pageCount?: number;
  usedVisionOcr: boolean;
}

export interface ExtractPdfTextOptions {
  modelId?: string;
  apiKey?: string;
  /** Firecrawl key for anydoc hosted OCR of scanned pages (keyless when absent). */
  firecrawlApiKey?: string;
  transcribePdfPages?: (
    pdfBuffer: Buffer,
    pageCount: number,
    modelId: string,
    apiKey: string,
  ) => Promise<string>;
  extractLinks?: (pdfBuffer: Buffer) => Promise<PdfLink[]>;
}

/**
 * PDF → Markdown with anydoc (local; hosted OCR only for scanned pages). When
 * anydoc cannot produce text, the user's vision model transcribes the pages
 * as a last resort. Link annotations are appended so icon links survive.
 */
export async function extractPdfTextTool(
  pdfBuffer: Buffer,
  options?: ExtractPdfTextOptions,
): Promise<ExtractPdfTextResult> {
  let text = '';
  let pageCount: number | undefined;
  let conversionError: DocumentConversionError | undefined;

  try {
    text = await convertDocumentToMarkdown(pdfBuffer, 'pdf', {
      firecrawlApiKey: options?.firecrawlApiKey,
    });
  } catch (error) {
    if (!(error instanceof DocumentConversionError)) throw error;
    if (error.code === 'encrypted') throw new Error(error.message);
    conversionError = error;
    pageCount = error.pageCount;
  }

  let usedVisionOcr = false;

  if (!text && options?.modelId && options?.apiKey) {
    if (options.transcribePdfPages) {
      text = await options.transcribePdfPages(
        pdfBuffer,
        pageCount ?? 0,
        options.modelId,
        options.apiKey,
      );
    } else {
      const ocr = await transcribePdfWithVisionTool(pdfBuffer, options.modelId, options.apiKey);
      text = ocr.text;
      pageCount ??= ocr.pageCount;
    }
    text = text.trim();
    usedVisionOcr = true;
  }

  if (!text) {
    throw new Error(conversionError?.message ?? 'No extractable text found in PDF');
  }

  const links = await (options?.extractLinks ?? extractPdfLinks)(pdfBuffer);

  return {
    text: appendPdfLinks(text, links),
    pageCount,
    usedVisionOcr,
  };
}
