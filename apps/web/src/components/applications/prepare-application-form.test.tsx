// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrepareApplicationForm } from './prepare-application-form';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: () => ({ data: { configured: false }, isLoading: false }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: [] }),
  };
});

describe('PrepareApplicationForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('gates intake on active AI agent account', () => {
    render(<PrepareApplicationForm />);
    expect(screen.getByText(/Configure an active AI agent account/i)).toBeInTheDocument();
  });
});
