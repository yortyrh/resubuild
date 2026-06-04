import { Agent } from '@mastra/core/agent';
import { sanitizeAiTypography } from '@resumind/types';
import { toAgentModelConfig } from '../workflows/agent-model-config';

const TRANSCRIBE_INSTRUCTIONS = `Transcribe all visible resume text from the image.
Return plain text only, preserving section headings, bullet lists, and paragraph breaks.
Do not summarize or omit content.`;

export async function transcribeImageResumeTool(
  imageBuffer: Buffer,
  mimeType: string,
  modelId: string,
  apiKey: string,
): Promise<string> {
  const agent = new Agent({
    id: 'resume-image-transcriber',
    name: 'resume-image-transcriber',
    instructions: TRANSCRIBE_INSTRUCTIONS,
    model: toAgentModelConfig(modelId, apiKey),
  });

  const response = await agent.generate([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extract the full resume text from this image.',
        },
        {
          type: 'image',
          image: imageBuffer,
          mimeType,
        },
      ],
    },
  ] as never);

  const text = response.text.trim();
  if (!text) {
    throw new Error('Could not read resume text from image');
  }

  return sanitizeAiTypography(text);
}
