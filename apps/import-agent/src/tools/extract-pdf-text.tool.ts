import { PDFParse } from 'pdf-parse';
import { transcribePdfWithVisionTool } from './transcribe-pdf-with-vision.tool';

export interface ExtractPdfTextResult {
  text: string;
  pageCount: number;
  usedVisionOcr: boolean;
}

export interface ExtractPdfTextOptions {
  modelId?: string;
  apiKey?: string;
  transcribePdfPages?: (
    pdfBuffer: Buffer,
    pageCount: number,
    modelId: string,
    apiKey: string,
  ) => Promise<string>;
}

export async function extractPdfTextTool(
  pdfBuffer: Buffer,
  options?: ExtractPdfTextOptions,
): Promise<ExtractPdfTextResult> {
  let pageCount = 0;
  let text = '';

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: pdfBuffer });
    const parsed = await parser.getText();
    pageCount = parsed.total;
    text = parsed.text.trim();
  } catch {
    pageCount = 0;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {
        // Best-effort cleanup; ignore failures so the main flow can continue.
      });
    }
  }

  let usedVisionOcr = false;

  if (!text && options?.modelId && options?.apiKey) {
    if (options.transcribePdfPages) {
      text = await options.transcribePdfPages(
        pdfBuffer,
        pageCount,
        options.modelId,
        options.apiKey,
      );
    } else {
      const ocr = await transcribePdfWithVisionTool(pdfBuffer, options.modelId, options.apiKey);
      text = ocr.text;
      if (pageCount === 0) {
        pageCount = ocr.pageCount;
      }
    }
    usedVisionOcr = true;
  }

  if (!text) {
    throw new Error('No extractable text found in PDF');
  }

  return {
    text,
    pageCount,
    usedVisionOcr,
  };
}
