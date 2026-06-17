// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobApplicationSummary } from '@/lib/api';
import { ApplicationUpdateDialog } from './application-update-dialog';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateApplication = vi.fn();
const mockUpdateApplicationMetadata = vi.fn();

vi.mock('@/lib/api', () => ({
  updateApplication: (...args: unknown[]) => mockUpdateApplication(...args),
  updateApplicationMetadata: (...args: unknown[]) => mockUpdateApplicationMetadata(...args),
}));

function buildApplication(overrides: Partial<JobApplicationSummary> = {}): JobApplicationSummary {
  return {
    id: 'app-1',
    status: 'ready',
    jobTitle: 'Engineer',
    jobCompany: 'Acme',
    userMessage: 'Emphasize React',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderDialog(application: JobApplicationSummary, open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <ApplicationUpdateDialog application={application} open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { ...utils, onOpenChange };
}

describe('ApplicationUpdateDialog', () => {
  beforeEach(() => {
    mockUpdateApplication.mockResolvedValue({ applicationId: 'app-1', status: 'queued' });
    mockUpdateApplicationMetadata.mockResolvedValue({ id: 'app-1' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('prefills position, company and message from the application', () => {
    renderDialog(buildApplication());

    expect(screen.getByLabelText('Position')).toHaveValue('Engineer');
    expect(screen.getByLabelText('Company')).toHaveValue('Acme');
    expect(screen.getByLabelText('Optional instruction')).toHaveValue('Emphasize React');
  });

  it('treats missing metadata as empty strings', () => {
    renderDialog(buildApplication({ jobTitle: null, jobCompany: null, userMessage: null }));

    expect(screen.getByLabelText('Position')).toHaveValue('');
    expect(screen.getByLabelText('Company')).toHaveValue('');
    expect(screen.getByLabelText('Optional instruction')).toHaveValue('');
  });

  it('patches metadata and triggers regeneration when fields change', async () => {
    const { onOpenChange } = renderDialog(buildApplication());

    fireEvent.change(screen.getByLabelText('Position'), {
      target: { value: 'Staff Engineer' },
    });
    fireEvent.change(screen.getByLabelText('Company'), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update application' }));

    await waitFor(() => {
      expect(mockUpdateApplicationMetadata).toHaveBeenCalledWith('app-1', {
        jobTitle: 'Staff Engineer',
        jobCompany: 'Acme Corp',
      });
    });

    expect(mockUpdateApplication).toHaveBeenCalledWith('app-1', {
      message: 'Emphasize React',
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('skips the metadata patch when fields are unchanged', async () => {
    renderDialog(buildApplication());

    fireEvent.click(screen.getByRole('button', { name: 'Update application' }));

    await waitFor(() => {
      expect(mockUpdateApplication).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateApplicationMetadata).not.toHaveBeenCalled();
  });

  it('patches only the field the user actually changed', async () => {
    renderDialog(buildApplication());

    fireEvent.change(screen.getByLabelText('Position'), {
      target: { value: '  Staff Engineer  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update application' }));

    await waitFor(() => {
      expect(mockUpdateApplicationMetadata).toHaveBeenCalledWith('app-1', {
        jobTitle: 'Staff Engineer',
      });
    });
  });
});
