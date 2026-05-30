// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportPreviewDialog } from './import-preview-dialog';

const mockListCvTemplates = vi.fn();

vi.mock('@/lib/api', () => ({
  listCvTemplates: (...args: unknown[]) => mockListCvTemplates(...args),
}));

vi.mock('@resumind/resume-template', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resumind/resume-template')>();
  return {
    ...actual,
    renderResumeHtml: vi.fn(() => '<html><body><article>Preview</article></body></html>'),
  };
});

import { renderResumeHtml } from '@resumind/resume-template';

const mockRenderResumeHtml = vi.mocked(renderResumeHtml);

describe('ImportPreviewDialog', () => {
  const resume = { basics: { name: 'Alex Smith' } };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('re-renders when template changes', async () => {
    mockListCvTemplates.mockResolvedValue([
      { id: 'classic', label: 'Classic' },
      { id: 'modern', label: 'Modern' },
    ]);

    const user = userEvent.setup({ delay: null });
    render(<ImportPreviewDialog open resume={resume} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(mockRenderResumeHtml).toHaveBeenCalledWith(resume, 'classic');
    });

    await user.selectOptions(screen.getByLabelText('Template'), 'modern');

    await waitFor(() => {
      expect(mockRenderResumeHtml).toHaveBeenCalledWith(resume, 'modern');
    });
  });

  it('closes without importing', async () => {
    mockListCvTemplates.mockResolvedValue([{ id: 'classic', label: 'Classic' }]);
    const onOpenChange = vi.fn();
    const user = userEvent.setup({ delay: null });

    render(<ImportPreviewDialog open resume={resume} onOpenChange={onOpenChange} />);

    await user.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
