import { Agent } from '@mastra/core/agent';
import { createEmptyResume, sanitizeAiTypographyDeep } from '@resubuild/types';
import { normalizeDatesTool } from '../tools/normalize-dates.tool';
import { validateResumeSchemaTool } from '../tools/validate-resume-schema.tool';
import { webLookupTool } from '../tools/web-lookup.tool';
import {
  buildWebsiteImportTools,
  type WebsiteImportToolsConfig,
} from '../tools/website-import-tools';
import type { ImportJobProgress, TextImportWorkflowResult } from '../types';
import { toAgentModelConfig } from './agent-model-config';
import { applySocialProfileDiscovery } from './social-profile-discovery';

const MAX_REPAIR_ATTEMPTS = 3;
const MAX_AGENT_STEPS = 12;

const WEBSITE_DRAFT_INSTRUCTIONS = `You import résumés/CVs from public websites into JSON Resume JSON.
Use the available tools to load page content (markdown or HTML) and optionally search the web for missing facts.
Return only valid JSON with basics, work, volunteer, education, skills, and other relevant sections.
Use ISO-8601 partial dates (YYYY or YYYY-MM) for date fields.
Put unpaid, volunteer, community service, and pro bono roles in volunteer[] (organization, position, dates, summary, highlights)—not in work[].
Put paid employment in work[] (name, position, location, dates, summary, description, highlights).`;

const REPAIR_INSTRUCTIONS = `You repair JSON Resume documents to satisfy schema validation errors.
Return only valid JSON. Preserve factual content from the draft unless fixing shape or dates.`;

export interface WebsiteImportWorkflowInput {
  sourceUrl: string;
  modelId: string;
  apiKey: string;
  toolsConfig: WebsiteImportToolsConfig;
  onProgress?: (progress: ImportJobProgress) => void;
  finalize?: (draft: Record<string, unknown>) => Promise<string>;
  generateDraft?: (prompt: string) => Promise<Record<string, unknown>>;
  repairDraft?: (
    draft: Record<string, unknown>,
    errors: string[],
  ) => Promise<Record<string, unknown>>;
}

function parseJsonFromAgentText(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Agent did not return JSON Resume');
  }
  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
}

async function generateWebsiteDraft(
  input: WebsiteImportWorkflowInput,
): Promise<Record<string, unknown>> {
  if (input.generateDraft) {
    return input.generateDraft(input.sourceUrl);
  }

  const tools = buildWebsiteImportTools(input.toolsConfig);
  const agent = new Agent({
    id: 'website-import-agent',
    name: 'website-import-agent',
    instructions: WEBSITE_DRAFT_INSTRUCTIONS,
    model: toAgentModelConfig(input.modelId, input.apiKey),
    tools,
  });

  const response = await agent.generate(
    `Import the CV/resume from this URL into JSON Resume JSON:\n${input.sourceUrl}\n\n` +
      'Start by loading the page with your page tool, then build complete JSON Resume data.',
    {
      maxSteps: MAX_AGENT_STEPS,
    },
  );

  return parseJsonFromAgentText(response.text);
}

async function generateRepair(
  modelId: string,
  apiKey: string,
  prompt: string,
  repairDraft?: WebsiteImportWorkflowInput['repairDraft'],
  draft?: Record<string, unknown>,
  errors?: string[],
): Promise<Record<string, unknown>> {
  if (repairDraft && draft && errors) {
    return repairDraft(draft, errors);
  }

  const agent = new Agent({
    id: 'website-import-repair',
    name: 'website-import-repair',
    instructions: REPAIR_INSTRUCTIONS,
    model: toAgentModelConfig(modelId, apiKey),
  });

  const response = await agent.generate(prompt);

  return parseJsonFromAgentText(response.text);
}

export async function runWebsiteImportWorkflow(
  input: WebsiteImportWorkflowInput,
): Promise<TextImportWorkflowResult> {
  const errors: string[] = [];

  input.onProgress?.('extracting');
  let draft = await generateWebsiteDraft(input);
  draft = sanitizeAiTypographyDeep({ ...createEmptyResume(), ...draft });

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
      await webLookupTool({
        query: company,
        searchApiKey: input.toolsConfig.searchApiKey,
      });
    }

    const validation = validateResumeSchemaTool(draft);
    if (validation.valid) {
      const discovery = await applySocialProfileDiscovery({
        draft,
        searchApiKey: input.toolsConfig.searchApiKey,
        onProgress: input.onProgress,
      });
      draft = discovery.draft;

      input.onProgress?.('finalizing');
      if (input.finalize) {
        const cvId = await input.finalize(draft);
        return {
          cvId,
          draft,
          errors,
          discoveredProfilesCount: discovery.discoveredProfilesCount,
        };
      }
      return {
        draft,
        errors,
        discoveredProfilesCount: discovery.discoveredProfilesCount,
      };
    }

    if (attempt === MAX_REPAIR_ATTEMPTS - 1) {
      errors.push(...validation.errors);
      return { draft, errors };
    }

    input.onProgress?.('repairing');
    draft = await generateRepair(
      input.modelId,
      input.apiKey,
      `Validation errors:\n${validation.errors.join('\n')}\n\nDraft:\n${JSON.stringify(draft)}`,
      input.repairDraft,
      draft,
      validation.errors,
    );
    draft = sanitizeAiTypographyDeep({ ...createEmptyResume(), ...draft });
  }

  return { draft, errors };
}
