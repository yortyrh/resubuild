import { convertDocumentToMarkdown } from './convert-document.tool';

export interface ExtractDocxTextResult {
  text: string;
}

/** Word (.docx) → Markdown with anydoc, keeping headings, lists, tables and links. */
export async function extractDocxTextTool(docxBuffer: Buffer): Promise<ExtractDocxTextResult> {
  try {
    return { text: await convertDocumentToMarkdown(docxBuffer, 'docx') };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'empty') {
      throw new Error('No extractable text found in DOCX');
    }
    throw error;
  }
}
