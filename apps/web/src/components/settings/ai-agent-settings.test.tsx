// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';

const mockGetAiAgentProviders = vi.fn();
const mockGetAiAgentModels = vi.fn();
const mockGetAiAgentAccounts = vi.fn();
const mockCreateAiAgentAccount = vi.fn();
const mockUpdateAiAgentAccount = vi.fn();
const mockSetAiAgentActive = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getAiAgentProviders: (...args: unknown[]) => mockGetAiAgentProviders(...args),
    getAiAgentModels: (...args: unknown[]) => mockGetAiAgentModels(...args),
    getAiAgentAccounts: (...args: unknown[]) => mockGetAiAgentAccounts(...args),
    getAiAgentActive: vi.fn(),
    createAiAgentAccount: (...args: unknown[]) => mockCreateAiAgentAccount(...args),
    updateAiAgentAccount: (...args: unknown[]) => mockUpdateAiAgentAccount(...args),
    deleteAiAgentAccount: vi.fn(),
    setAiAgentActive: (...args: unknown[]) => mockSetAiAgentActive(...args),
  };
});

import { AiAgentSettings } from './ai-agent-settings';

function renderSettings() {
  return render(
    <QueryProvider>
      <AiAgentSettings />
    </QueryProvider>,
  );
}

describe('AiAgentSettings', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads accounts and providers', async () => {
    mockGetAiAgentProviders.mockResolvedValue([
      {
        id: 'openai',
        displayName: 'OpenAI',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        apiKeyLabel: 'OpenAI API key',
      },
    ]);
    mockGetAiAgentAccounts.mockResolvedValue([]);

    renderSettings();

    expect(await screen.findByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });

  it('creates account from dialog', async () => {
    mockGetAiAgentProviders.mockResolvedValue([
      {
        id: 'openai',
        displayName: 'OpenAI',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        apiKeyLabel: 'OpenAI API key',
      },
    ]);
    mockGetAiAgentAccounts.mockResolvedValue([]);
    mockGetAiAgentModels.mockResolvedValue([
      { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', recommendedForPdfImport: true },
    ]);
    mockCreateAiAgentAccount.mockResolvedValue({ id: 'acc-1' });

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    await user.selectOptions(screen.getByLabelText('Provider'), 'openai');
    await waitFor(() => {
      expect(screen.getByLabelText('Model')).not.toBeDisabled();
    });
    await user.selectOptions(screen.getByLabelText('Model'), 'openai/gpt-4o-mini');
    await user.type(screen.getByLabelText('OpenAI API key'), 'sk-test');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateAiAgentAccount.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          modelId: 'openai/gpt-4o-mini',
          apiKey: 'sk-test',
        }),
      );
    });
  });

  it('shows reconfiguration banner for undecryptable accounts', async () => {
    mockGetAiAgentProviders.mockResolvedValue([]);
    mockGetAiAgentAccounts.mockResolvedValue([
      {
        id: 'acc-1',
        label: 'Default',
        providerId: 'openai',
        modelId: 'openai/gpt-4o-mini',
        isActive: true,
        reconfigurationRequired: true,
        createdAt: 'now',
        updatedAt: 'now',
      },
    ]);

    renderSettings();

    expect(
      await screen.findByText(/cannot be read after an encryption key change/i),
    ).toBeInTheDocument();
  });
});
