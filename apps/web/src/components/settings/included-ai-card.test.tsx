// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiIncludedStatus } from '@/lib/api';
import { IncludedAiCard } from './included-ai-card';

const status: AiIncludedStatus = {
  enabled: true,
  available: true,
  usage: { used: 50_000, limit: 200_000, remaining: 150_000, resetsAt: '2026-12-01T00:00:00Z' },
  models: [{ providerId: 'openai', providerDisplayName: 'OpenAI', modelDisplayName: 'GPT-5 Mini' }],
};

describe('IncludedAiCard', () => {
  afterEach(() => cleanup());

  it('shows the models and the monthly usage', () => {
    render(<IncludedAiCard status={status} isActive onSelect={vi.fn()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getByText(/50k of 200k tokens used this month/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50000');
    expect(screen.queryByRole('button', { name: 'Use included AI' })).not.toBeInTheDocument();
  });

  it('lets the user switch to included AI', async () => {
    const onSelect = vi.fn();
    render(<IncludedAiCard status={status} isActive={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use included AI' }));
    expect(onSelect).toHaveBeenCalled();
  });

  it('explains when the allowance or the budget is used up', () => {
    const { rerender } = render(
      <IncludedAiCard
        status={{ ...status, usage: { ...status.usage!, used: 200_000, remaining: 0 } }}
        isActive
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/You have used this month's included AI/)).toBeInTheDocument();
    rerender(
      <IncludedAiCard status={{ ...status, available: false }} isActive onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/Included AI has reached this month's budget/)).toBeInTheDocument();
  });
});
