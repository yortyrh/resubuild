import pdfParse from 'pdf-parse';
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

  try {
    const parsed = await pdfParse(pdfBuffer);
    pageCount = parsed.numpages;
    text = parsed.text.trim();
  } catch {
    pageCount = 0;
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
