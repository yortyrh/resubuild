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

  const anthropicProvider = {
    id: 'anthropic',
    displayName: 'Anthropic (BYOK — API key from console.anthropic.com)',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    apiKeyLabel: 'Anthropic API key',
    modelOptions: [
      {
        key: 'thinking',
        label: 'Extended thinking',
        description: 'Thinking mode.',
        kind: 'enum',
        values: ['adaptive', 'enabled', 'disabled'],
        reasoningOnly: true,
      },
      {
        key: 'budgetTokens',
        label: 'Thinking budget (tokens)',
        description: 'Budget.',
        kind: 'integer',
        min: 1024,
        max: 128000,
        reasoningOnly: true,
        dependsOn: { key: 'thinking', values: ['enabled'] },
      },
      {
        key: 'effort',
        label: 'Effort',
        description: 'Effort.',
        kind: 'enum',
        values: ['low', 'medium', 'high'],
        reasoningOnly: true,
      },
    ],
  };
  const anthropicModels = [
    {
      id: 'anthropic/claude-opus-4-5',
      displayName: 'Claude Opus 4.5',
      recommendedForPdfImport: false,
      reasoning: true,
    },
    {
      id: 'anthropic/claude-3-haiku',
      displayName: 'Claude Haiku 3',
      recommendedForPdfImport: true,
      reasoning: false,
    },
  ];
  const opusAccount = {
    id: 'acc-1',
    label: null,
    providerId: 'anthropic',
    modelId: 'anthropic/claude-opus-4-5',
    modelOptions: { effort: 'high' },
    providerDisplayName: 'Anthropic',
    modelDisplayName: 'Claude Opus 4.5',
    displayName: 'Anthropic · Claude Opus 4.5',
    isActive: true,
    createdAt: 'now',
    updatedAt: 'now',
  };

  it('lists accounts with provider icon, display name and set options', async () => {
    mockGetAiAgentProviders.mockResolvedValue([anthropicProvider]);
    mockGetAiAgentAccounts.mockResolvedValue([opusAccount]);

    renderSettings();

    expect(await screen.findByText('Anthropic · Claude Opus 4.5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Anthropic' })).toBeInTheDocument();
    expect(screen.getByText('Effort: high')).toBeInTheDocument();
  });

  it('turns off browser autofill and explains the default label', async () => {
    mockGetAiAgentProviders.mockResolvedValue([anthropicProvider]);
    mockGetAiAgentAccounts.mockResolvedValue([]);
    mockGetAiAgentModels.mockResolvedValue(anthropicModels);

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    const labelInput = screen.getByLabelText('Label (optional)');
    const keyInput = screen.getByLabelText('API key');
    expect(labelInput).toHaveAttribute('autocomplete', 'off');
    expect(labelInput).toHaveAttribute('data-1p-ignore', 'true');
    expect(labelInput).toHaveAttribute('data-lpignore', 'true');
    expect(labelInput).toHaveValue('');
    expect(keyInput).toHaveAttribute('autocomplete', 'new-password');
    expect(keyInput).toHaveAttribute('data-1p-ignore', 'true');
    expect(keyInput).toHaveValue('');

    await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic');
    await waitFor(() => expect(screen.getByLabelText('Model')).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText('Model'), 'anthropic/claude-opus-4-5');

    expect(screen.getByText('“Anthropic · Claude Opus 4.5”')).toBeInTheDocument();
  });

  it('sends reasoning options, showing dependent fields only when they apply', async () => {
    mockGetAiAgentProviders.mockResolvedValue([anthropicProvider]);
    mockGetAiAgentAccounts.mockResolvedValue([]);
    mockGetAiAgentModels.mockResolvedValue(anthropicModels);
    mockCreateAiAgentAccount.mockResolvedValue({ id: 'acc-1' });

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic');
    await waitFor(() => expect(screen.getByLabelText('Model')).not.toBeDisabled());

    await user.selectOptions(screen.getByLabelText('Model'), 'anthropic/claude-3-haiku');
    expect(screen.queryByLabelText('Extended thinking')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Model'), 'anthropic/claude-opus-4-5');
    expect(screen.getByLabelText('Extended thinking')).toHaveValue('');
    expect(screen.queryByLabelText('Thinking budget (tokens)')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Extended thinking'), 'enabled');
    await user.type(screen.getByLabelText('Thinking budget (tokens)'), '4096');
    await user.type(screen.getByLabelText('Anthropic API key'), 'sk-ant');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateAiAgentAccount.mock.calls[0]?.[0]).toEqual({
        label: undefined,
        modelId: 'anthropic/claude-opus-4-5',
        apiKey: 'sk-ant',
        modelOptions: { thinking: 'enabled', budgetTokens: 4096 },
      });
    });
  });

  it('shows that a key is saved when editing and keeps it when left empty', async () => {
    mockGetAiAgentProviders.mockResolvedValue([anthropicProvider]);
    mockGetAiAgentAccounts.mockResolvedValue([opusAccount]);
    mockGetAiAgentModels.mockResolvedValue(anthropicModels);
    mockUpdateAiAgentAccount.mockResolvedValue(opusAccount);

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByText('API key saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Anthropic API key')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Effort')).toHaveValue('high'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateAiAgentAccount).toHaveBeenCalledWith('acc-1', {
        label: '',
        modelId: 'anthropic/claude-opus-4-5',
        modelOptions: { effort: 'high' },
        keepExistingApiKey: true,
      });
    });
  });

  it('asks for a label before adding a second unlabeled account for the same model', async () => {
    mockGetAiAgentProviders.mockResolvedValue([anthropicProvider]);
    mockGetAiAgentAccounts.mockResolvedValue([opusAccount]);
    mockGetAiAgentModels.mockResolvedValue(anthropicModels);

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    expect(screen.getByText('Your accounts: Anthropic · Claude Opus 4.5')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic');
    await waitFor(() => expect(screen.getByLabelText('Model')).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText('Model'), 'anthropic/claude-opus-4-5');
    await user.type(screen.getByLabelText('Anthropic API key'), 'sk-ant');

    expect(screen.getByText(/Add a label to tell them apart/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.type(screen.getByLabelText('Label (optional)'), 'Personal');
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});
