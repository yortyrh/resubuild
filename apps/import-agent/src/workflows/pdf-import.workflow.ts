import { Agent } from '@mastra/core/agent';
import { createEmptyResume, sanitizeAiTypographyDeep } from '@resumind/types';
import { extractPdfTextTool } from '../tools/extract-pdf-text.tool';
import { normalizeDatesTool } from '../tools/normalize-dates.tool';
import { validateResumeSchemaTool } from '../tools/validate-resume-schema.tool';
import { webLookupTool } from '../tools/web-lookup.tool';
import type {
  PdfImportWorkflowInput,
  PdfImportWorkflowResult,
  TextImportWorkflowInput,
  TextImportWorkflowResult,
} from '../types';

const MAX_REPAIR_ATTEMPTS = 3;

const DRAFT_INSTRUCTIONS = `You convert resume plain text into JSON Resume JSON.
Return only valid JSON with basics, work, education, skills, and other relevant sections.
Use ISO-8601 partial dates (YYYY or YYYY-MM) for date fields.`;

const REPAIR_INSTRUCTIONS = `You repair JSON Resume documents to satisfy schema validation errors.
Return only valid JSON. Preserve factual content from the draft unless fixing shape or dates.`;

function createAgent(modelId: string, apiKey: string, instructions: string) {
  return new Agent({
    name: 'pdf-import-agent',
    instructions,
    model: {
      id: modelId,
      apiKey,
    },
  });
}

async function generateJsonFromPrompt(
  modelId: string,
  apiKey: string,
  instructions: string,
  prompt: string,
  generate?: TextImportWorkflowInput['generateDraft'],
): Promise<Record<string, unknown>> {
  if (generate) {
    return generate(prompt);
  }

  const agent = createAgent(modelId, apiKey, instructions);
  const response = await agent.generate(prompt, {
    structuredOutput: {
      schema: {
        type: 'object',
        additionalProperties: true,
      },
    },
  });

  const text = response.text.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('LLM did not return JSON');
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
}

export async function runTextImportWorkflow(
  input: TextImportWorkflowInput,
): Promise<TextImportWorkflowResult> {
  const errors: string[] = [];

  input.onProgress?.('drafting');
  let draft = await generateJsonFromPrompt(
    input.modelId,
    input.apiKey,
    DRAFT_INSTRUCTIONS,
    `Resume text:\n\n${input.sourceText}`,
    input.generateDraft,
  );

  draft = {
    ...createEmptyResume(),
    ...draft,
  };

  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt += 1) {
    input.onProgress?.('verifying');
    draft = normalizeDatesTool(draft);

    const companyNames = Array.isArray(draft.work)
      ? draft.work
          .map((entry) =>
            entry && typeof entry === 'object' ? (entry as { name?: string }).name : undefined,
          )
          .filter((name): name is string => Boolean(name))
      : [];

    for (const company of companyNames.slice(0, 3)) {
      await webLookupTool({ query: company, searchApiKey: input.searchApiKey });
    }

    const validation = validateResumeSchemaTool(draft);
    if (validation.valid) {
      input.onProgress?.('finalizing');
      if (input.finalize) {
        const cvId = await input.finalize(draft);
        return { cvId, draft, errors };
      }
      return { draft, errors };
    }

    if (attempt === MAX_REPAIR_ATTEMPTS - 1) {
      errors.push(...validation.errors);
      return { draft, errors };
    }

    input.onProgress?.('repairing');
    if (input.repairDraft) {
      draft = await input.repairDraft(draft, validation.errors);
    } else {
      draft = await generateJsonFromPrompt(
        input.modelId,
        input.apiKey,
        REPAIR_INSTRUCTIONS,
        `Validation errors:\n${validation.errors.join('\n')}\n\nDraft:\n${JSON.stringify(draft)}`,
      );
    }
    draft = sanitizeAiTypographyDeep({
      ...createEmptyResume(),
      ...draft,
    });
  }

  return { draft, errors };
}

export async function runPdfImportWorkflow(
  input: PdfImportWorkflowInput,
): Promise<PdfImportWorkflowResult> {
  input.onProgress?.('extracting');
  const extracted = await extractPdfTextTool(input.pdfBuffer);

  return runTextImportWorkflow({
    sourceText: extracted.text,
    modelId: input.modelId,
    apiKey: input.apiKey,
    searchApiKey: input.searchApiKey,
    onProgress: input.onProgress,
    finalize: input.finalize,
    generateDraft: input.generateDraft,
    repairDraft: input.repairDraft,
  });
}

export function createPdfImportWorkflow(options: { modelId: string; apiKey: string }) {
  return {
    modelId: options.modelId,
    apiKey: options.apiKey,
    run: (input: Omit<PdfImportWorkflowInput, 'modelId' | 'apiKey'>) =>
      runPdfImportWorkflow({
        ...input,
        modelId: options.modelId,
        apiKey: options.apiKey,
      }),
  };
}

/**
 * Future workflows (section chat, incremental writes) can reuse `toolRegistry`.
 * See README in apps/import-agent for extension notes.
 */
export const createResumeChatWorkflow = undefined;
