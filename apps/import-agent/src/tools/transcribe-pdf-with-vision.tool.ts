import { Agent } from '@mastra/core/agent';
import { sanitizeAiTypography } from '@resumind/types';
import { toAgentModelConfig } from '../workflows/agent-model-config';
import { renderPdfPagesToPng } from './render-pdf-pages';

const TRANSCRIBE_INSTRUCTIONS = `Transcribe all visible resume text from the provided page images.
Return plain text only, preserving section headings, bullet lists, and paragraph breaks.
Do not summarize or omit content.`;

export async function transcribePdfWithVisionTool(
  pdfBuffer: Buffer,
  modelId: string,
  apiKey: string,
  transcribePages?: (pageImages: Buffer[], modelId: string, apiKey: string) => Promise<string>,
): Promise<{ text: string; pageCount: number }> {
  const { images: pageImages, pageCount } = await renderPdfPagesToPng(pdfBuffer);
  if (!pageImages.length) {
    throw new Error('Could not render PDF pages for OCR');
  }

  if (transcribePages) {
    return {
      text: await transcribePages(pageImages, modelId, apiKey),
      pageCount,
    };
  }

  const agent = new Agent({
    id: 'pdf-ocr-transcriber',
    name: 'pdf-ocr-transcriber',
    instructions: TRANSCRIBE_INSTRUCTIONS,
    model: toAgentModelConfig(modelId, apiKey),
  });

  const response = await agent.generate([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            pageImages.length === 1
              ? 'Extract the full resume text from this page.'
              : `Extract the full resume text from these ${pageImages.length} pages in order.`,
        },
        ...pageImages.map((image) => ({
          type: 'image' as const,
          image,
          mimeType: 'image/png' as const,
        })),
      ],
    },
  ] as never);

  const text = response.text.trim();
  if (!text) {
    throw new Error('Could not read resume text from PDF');
  }

  return { text: sanitizeAiTypography(text), pageCount };
}
