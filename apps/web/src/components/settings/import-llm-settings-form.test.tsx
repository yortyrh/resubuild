// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AiAgentSettings } from './ai-agent-settings';
import { ImportLlmSettingsForm } from './import-llm-settings-form';

describe('ImportLlmSettingsForm', () => {
  it('re-exports AiAgentSettings for legacy imports', () => {
    expect(ImportLlmSettingsForm).toBe(AiAgentSettings);
  });
});
