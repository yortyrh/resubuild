// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvApplicationPromoteButton } from './cv-application-promote-button';

const mockPromoteApplicationClone = vi.fn();

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  promoteApplicationClone: (...args: unknown[]) => mockPromoteApplicationClone(...args),
}));

const application = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Engineering Manager',
  jobCompany: 'Acme',
  tailoredCvId: 'clone-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CvApplicationPromoteButton application={application} />
    </QueryClientProvider>,
  );
}

describe('CvApplicationPromoteButton', () => {
  beforeEach(() => {
    mockPromoteApplicationClone.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders promote action with accessible label', () => {
    renderButton();

    expect(screen.getByRole('button', { name: 'Promote' })).toBeInTheDocument();
  });

  it('promotes clone through the application API', async () => {
    const user = userEvent.setup({ delay: null });
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Promote' }));

    await waitFor(() => {
      expect(mockPromoteApplicationClone).toHaveBeenCalledWith('app-1');
    });
  });
});
