// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationList } from './application-list';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockListApplications = vi.fn();
const mockDeleteApplication = vi.fn();

vi.mock('@/lib/api', () => ({
  listApplications: (...args: unknown[]) => mockListApplications(...args),
  deleteApplication: (...args: unknown[]) => mockDeleteApplication(...args),
}));

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationList />
    </QueryClientProvider>,
  );
}

describe('ApplicationList', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the skeleton while the list is loading', () => {
    // Promise that never resolves → isLoading stays true.
    mockListApplications.mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText('Loading applications')).toBeInTheDocument();
  });

  it('lists applications', async () => {
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderList();

    expect(await screen.findByRole('link', { name: /Engineer · Acme/i })).toHaveAttribute(
      'href',
      '/dashboard/applications/app-1',
    );
  });

  it('deletes an application after confirmation', async () => {
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockDeleteApplication.mockResolvedValue(undefined);

    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);

    await waitFor(() => {
      expect(mockDeleteApplication.mock.calls[0]?.[0]).toBe('app-1');
    });
  });

  it('hides the "Prepare application" visible label below sm and exposes it via aria-label', async () => {
    mockListApplications.mockResolvedValue([]);

    const { container } = renderList();

    const trigger = await screen.findByRole('link', { name: 'Prepare application' });
    expect(trigger).toHaveAttribute('aria-label', 'Prepare application');
    expect(trigger).toHaveAttribute('href', '/dashboard/applications/new');

    const visibleLabel = container.querySelector('span.hidden.sm\\:inline');
    expect(visibleLabel).not.toBeNull();
    expect(visibleLabel).toHaveTextContent('Prepare application');
  });
});
