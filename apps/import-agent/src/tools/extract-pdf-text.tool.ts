import pdfParse from 'pdf-parse';

export interface ExtractPdfTextResult {
  text: string;
  pageCount: number;
}

export async function extractPdfTextTool(pdfBuffer: Buffer): Promise<ExtractPdfTextResult> {
  const parsed = await pdfParse(pdfBuffer);
  const text = parsed.text.trim();

  if (!text) {
    throw new Error('No extractable text found in PDF');
  }

  return {
    text,
    pageCount: parsed.numpages,
  };
}
