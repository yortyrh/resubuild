// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetImportLlmProviders = vi.fn();
const mockGetImportLlmModels = vi.fn();
const mockGetImportLlmConfig = vi.fn();
const mockSaveImportLlmConfig = vi.fn();

vi.mock('@/lib/api', () => ({
  getImportLlmProviders: (...args: unknown[]) => mockGetImportLlmProviders(...args),
  getImportLlmModels: (...args: unknown[]) => mockGetImportLlmModels(...args),
  getImportLlmConfig: (...args: unknown[]) => mockGetImportLlmConfig(...args),
  saveImportLlmConfig: (...args: unknown[]) => mockSaveImportLlmConfig(...args),
}));

import { ImportLlmSettingsForm } from './import-llm-settings-form';

describe('ImportLlmSettingsForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads providers and models in provider-first order', async () => {
    mockGetImportLlmProviders.mockResolvedValue([
      {
        id: 'openai',
        displayName: 'OpenAI',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        apiKeyLabel: 'OpenAI API key',
      },
    ]);
    mockGetImportLlmConfig.mockResolvedValue({ configured: false });
    mockGetImportLlmModels.mockResolvedValue([
      { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', recommendedForPdfImport: true },
    ]);

    render(<ImportLlmSettingsForm />);

    expect(await screen.findByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeDisabled();
  });

  it('saves valid configuration', async () => {
    mockGetImportLlmProviders.mockResolvedValue([
      {
        id: 'openai',
        displayName: 'OpenAI',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        apiKeyLabel: 'OpenAI API key',
      },
    ]);
    mockGetImportLlmConfig.mockResolvedValue({ configured: false });
    mockGetImportLlmModels.mockResolvedValue([
      { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', recommendedForPdfImport: true },
    ]);
    mockSaveImportLlmConfig.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
    });

    const user = userEvent.setup({ delay: null });
    render(<ImportLlmSettingsForm />);

    await user.selectOptions(await screen.findByLabelText('Provider'), 'openai');
    await waitFor(() => {
      expect(screen.getByLabelText('Model')).not.toBeDisabled();
    });
    await user.selectOptions(screen.getByLabelText('Model'), 'openai/gpt-4o-mini');
    await user.type(screen.getByLabelText('OpenAI API key'), 'sk-test');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(mockSaveImportLlmConfig).toHaveBeenCalledWith({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      });
    });
  });

  it('requires api key again after encryption key rotation', async () => {
    mockGetImportLlmProviders.mockResolvedValue([
      {
        id: 'openai',
        displayName: 'OpenAI',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        apiKeyLabel: 'OpenAI API key',
      },
    ]);
    mockGetImportLlmConfig.mockResolvedValue({
      configured: false,
      reconfigurationRequired: true,
      modelId: 'openai/gpt-4o-mini',
    });
    mockGetImportLlmModels.mockResolvedValue([
      { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', recommendedForPdfImport: true },
    ]);

    render(<ImportLlmSettingsForm />);

    expect(
      await screen.findByText(/cannot be read after an encryption key change/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  });
});
