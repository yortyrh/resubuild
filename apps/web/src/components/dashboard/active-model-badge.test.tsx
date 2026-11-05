// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiAgentActive } from '@/lib/queries/ai-agent-queries';
import { ActiveModelBadge } from './active-model-badge';

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: vi.fn(),
}));

function mockActive(data: unknown, isLoading = false) {
  vi.mocked(useAiAgentActive).mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useAiAgentActive
  >);
}

describe('ActiveModelBadge', () => {
  afterEach(() => cleanup());

  it('renders nothing while loading', () => {
    mockActive(undefined, true);
    const { container } = render(<ActiveModelBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the provider icon and the account display name', () => {
    mockActive({
      configured: true,
      providerId: 'anthropic',
      modelId: 'anthropic/claude-opus-4-5',
      label: 'Work',
      displayName: 'Work',
      providerDisplayName: 'Anthropic',
      modelDisplayName: 'Claude Opus 4.5',
    });
    render(<ActiveModelBadge />);
    const link = screen.getByRole('link', { name: 'AI model: Work' });
    expect(link).toHaveAttribute('title', 'AI model: Work (Anthropic · Claude Opus 4.5)');
    expect(link.querySelector('[data-provider-icon="anthropic"]')).not.toBeNull();
  });

  it('keeps the name for screen readers in compact mode', () => {
    mockActive({
      configured: true,
      providerId: 'openai',
      modelId: 'openai/gpt-5',
      displayName: 'OpenAI · GPT-5',
    });
    render(<ActiveModelBadge compact />);
    expect(screen.getByText('OpenAI · GPT-5')).toHaveClass('sr-only');
  });

  it('invites the user to set up AI when nothing is configured', () => {
    mockActive({ configured: false });
    render(<ActiveModelBadge />);
    expect(screen.getByRole('link', { name: 'Set up AI' })).toHaveAttribute(
      'href',
      '/dashboard/settings/ai-agent',
    );
  });

  it('warns when the saved key can no longer be read', () => {
    mockActive({ configured: false, reconfigurationRequired: true, modelId: 'openai/gpt-5' });
    render(<ActiveModelBadge />);
    expect(screen.getByRole('link', { name: 'Re-enter AI key' })).toBeInTheDocument();
  });

  it('shows included AI with the tokens left this month', () => {
    mockActive({
      configured: true,
      source: 'included',
      displayName: 'Resubuild included AI',
      usage: { used: 50_000, limit: 200_000, remaining: 150_000, resetsAt: '2026-12-01T00:00:00Z' },
      exhausted: false,
    });
    render(<ActiveModelBadge />);
    expect(
      screen.getByRole('link', {
        name: 'AI: Resubuild included AI, 150k tokens left this month',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('· 150k left')).toBeInTheDocument();
  });

  it('warns when included AI is used up', () => {
    mockActive({ configured: false, source: 'included', exhausted: true });
    render(<ActiveModelBadge />);
    expect(screen.getByRole('link', { name: 'Included AI used up' })).toBeInTheDocument();
  });
});
