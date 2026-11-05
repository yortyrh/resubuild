// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/cv/cv-preview-iframe', () => ({
  CvPreviewIframe: ({ title }: { title: string }) => <div data-testid="preview">{title}</div>,
}));
vi.mock('@/components/guest-import/turnstile-widget', () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken('turnstile-token')}>
      Solve challenge
    </button>
  ),
}));

const api = vi.hoisted(() => ({
  getGuestImportStatus: vi.fn(),
  startGuestFileImport: vi.fn(),
  startGuestUrlImport: vi.fn(),
  getGuestImportJob: vi.fn(),
}));
vi.mock('@/lib/guest-import-api', () => api);

import { loadPendingGuestImport } from '@/lib/pending-guest-import';
import { GuestImportWizard } from './guest-import-wizard';

const resume = { basics: { name: 'Jane Doe' } };

describe('GuestImportWizard', () => {
  beforeEach(() => {
    api.getGuestImportStatus.mockResolvedValue({ enabled: true, turnstileSiteKey: 'site' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('points to sign-up when the free import is closed', async () => {
    api.getGuestImportStatus.mockResolvedValue({ enabled: false });
    render(<GuestImportWizard />);
    expect(await screen.findByText('Free import is not available right now.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('imports a file after the challenge, previews it and keeps it for sign-up', async () => {
    api.startGuestFileImport.mockResolvedValue({ kind: 'job', jobId: 'j1', guestToken: 'g1' });
    api.getGuestImportJob
      .mockResolvedValueOnce({ status: 'running', progress: 'drafting' })
      .mockResolvedValue({ status: 'succeeded', previewData: resume });
    const user = userEvent.setup({ delay: null });
    render(<GuestImportWizard pollMs={5} />);

    const fileInput = await screen.findByLabelText('Your CV (PDF, Word, Markdown or image)');
    await user.upload(fileInput, new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('button', { name: 'Import my CV' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Solve challenge' }));
    await user.click(screen.getByRole('button', { name: 'Import my CV' }));

    expect(api.startGuestFileImport).toHaveBeenCalledWith(expect.any(File), 'turnstile-token');
    expect(await screen.findByText('Jane Doe, your CV is ready.')).toBeInTheDocument();
    expect(api.getGuestImportJob).toHaveBeenCalledWith('j1', 'g1');

    await user.click(screen.getByRole('button', { name: 'Create account to keep it' }));
    expect(loadPendingGuestImport()).toEqual(resume);
    expect(push).toHaveBeenCalledWith('/register');
  });

  it('shows JSON Resume pages right away and failed imports as errors', async () => {
    api.getGuestImportStatus.mockResolvedValue({ enabled: true });
    api.startGuestUrlImport.mockRejectedValueOnce(new Error('Too many free imports today'));
    api.startGuestUrlImport.mockResolvedValueOnce({ kind: 'json', data: resume });
    const user = userEvent.setup({ delay: null });
    render(<GuestImportWizard />);

    await user.click(await screen.findByRole('tab', { name: 'From a web page' }));
    await user.type(screen.getByLabelText(/Page with your CV/), 'https://jane.dev');
    await user.click(screen.getByRole('button', { name: 'Import my CV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many free imports today');

    await user.click(screen.getByRole('button', { name: 'Import my CV' }));
    expect(await screen.findByText('Jane Doe, your CV is ready.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I have an account' }));
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('returns to the form with the error when the job fails', async () => {
    api.startGuestFileImport.mockResolvedValue({ kind: 'job', jobId: 'j1', guestToken: 'g1' });
    api.getGuestImportJob.mockResolvedValue({ status: 'failed', errors: ['Not a CV'] });
    api.getGuestImportStatus.mockResolvedValue({ enabled: true });
    const user = userEvent.setup({ delay: null });
    render(<GuestImportWizard pollMs={5} />);

    await user.upload(
      await screen.findByLabelText('Your CV (PDF, Word, Markdown or image)'),
      new File(['x'], 'cv.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Import my CV' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Not a CV'));
  });
});
