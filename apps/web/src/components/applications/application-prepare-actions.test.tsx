// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationPrepareActions } from './application-prepare-actions';

const mockCancel = vi.fn();
const mockRetry = vi.fn();
const mockDelete = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/api', () => ({
  cancelApplication: (...args: unknown[]) => mockCancel(...args),
  retryApplication: (...args: unknown[]) => mockRetry(...args),
  deleteApplication: (...args: unknown[]) => mockDelete(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

describe('ApplicationPrepareActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancel.mockResolvedValue({ id: 'app-1', status: 'failed' });
    mockRetry.mockResolvedValue({ applicationId: 'app-1', status: 'queued' });
    mockDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows stop and retry while queued', () => {
    render(<ApplicationPrepareActions applicationId="app-1" application={{ status: 'queued' }} />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('calls cancel when stop is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();

    render(
      <ApplicationPrepareActions
        applicationId="app-1"
        application={{ status: 'running' }}
        onStatusChange={onStatusChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(mockCancel).toHaveBeenCalledWith('app-1');
    expect(onStatusChange).toHaveBeenCalled();
  });
});
