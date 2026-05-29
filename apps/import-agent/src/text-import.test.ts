import { createEmptyResume } from '@resumind/types';
import { describe, expect, it } from 'vitest';
import { runTextImportWorkflow } from './workflows/pdf-import.workflow';

describe('runTextImportWorkflow', () => {
  it('repairs invalid drafts within the attempt limit', async () => {
    let repairCalls = 0;

    const result = await runTextImportWorkflow({
      sourceText: 'Jane Doe\nSoftware Engineer at Acme Corp',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateDraft: async () => ({ basics: 'invalid' }),
      repairDraft: async () => {
        repairCalls += 1;
        return {
          ...createEmptyResume(),
          basics: { name: 'Jane Doe' },
        };
      },
      finalize: async () => 'cv-456',
    });

    expect(repairCalls).toBeGreaterThan(0);
    expect(result.cvId).toBe('cv-456');
  });

  it('returns validation errors when repair attempts are exhausted', async () => {
    const result = await runTextImportWorkflow({
      sourceText: 'Invalid resume text',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateDraft: async () => ({ basics: 'invalid' }),
      repairDraft: async () => ({ basics: 'still invalid' }),
    });

    expect(result.cvId).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
