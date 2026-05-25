// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockUploadResumeMedia = vi.fn();
vi.mock('@/lib/api', () => ({
  uploadResumeMedia: (...args: unknown[]) => mockUploadResumeMedia(...args),
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

  it('invokes onSave with title and basics payload when Save is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.type(screen.getByPlaceholderText('Untitled CV'), 'My CV');
    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[1], 'Jane Doe');
    const emailInput = document.querySelector('input[type="email"]');
    expect(emailInput).toBeTruthy();
    await user.type(emailInput!, 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
    expect(mockOnSave).toHaveBeenCalledWith({
      title: 'My CV',
      basics: expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@example.com',
        location: {},
      }),
    });
  });

  it('calls onCancel when Cancel is clicked without saving', async () => {
    const user = userEvent.setup();
    render(<CreateCvForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
