// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockUploadResumeMedia = vi.fn();
vi.mock('@/lib/api', () => ({
  uploadResumeMedia: (...args: unknown[]) => mockUploadResumeMedia(...args),
}));

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
    <textarea
      aria-label="Summary"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

import { CreateCvForm } from './create-cv-form';

describe('CreateCvForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not call onSave or uploadResumeMedia on mount', () => {
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockUploadResumeMedia).not.toHaveBeenCalled();
  });

  it('does not render a separate CV title field', () => {
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.queryByPlaceholderText('Untitled CV')).not.toBeInTheDocument();
  });

  it('invokes onSave with basics payload when Save is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.type(screen.getAllByRole('textbox')[0], 'Jane Doe');
    const emailInput = document.querySelector('input[type="email"]');
    expect(emailInput).toBeTruthy();
    await user.type(emailInput!, 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
    expect(mockOnSave).toHaveBeenCalledWith({
      basics: expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@example.com',
        location: {},
      }),
    });
  }, 15_000);

  it('calls onCancel when Cancel is clicked without saving', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('invokes onSave when Enter is pressed in a text field', async () => {
    mockOnSave.mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.type(screen.getAllByRole('textbox')[0], 'Jane Doe{Enter}');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });
});
