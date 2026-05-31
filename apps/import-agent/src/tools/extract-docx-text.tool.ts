import mammoth from 'mammoth';

export interface ExtractDocxTextResult {
  text: string;
}

export async function extractDocxTextTool(docxBuffer: Buffer): Promise<ExtractDocxTextResult> {
  const result = await mammoth.extractRawText({ buffer: docxBuffer });
  const text = result.value.trim();

  if (!text) {
    throw new Error('No extractable text found in DOCX');
  }

  return { text };
}
