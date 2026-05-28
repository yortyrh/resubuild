// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportFileUpload } from './import-file-upload';

describe('ImportFileUpload', () => {
  const mockOnFileSelect = vi.fn();
  const accept = { 'application/json': ['.json'] };
  const maxBytes = 1024;

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('selects a valid file by click', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ImportFileUpload
        accept={accept}
        maxBytes={maxBytes}
        label="JSON Resume file"
        value={null}
        onFileSelect={mockOnFileSelect}
      />,
    );

    const file = new File(['{"basics":{}}'], 'resume.json', { type: 'application/json' });
    const input = screen.getByTestId('import-file-upload-input');
    await user.upload(input, file);

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects oversized files', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ImportFileUpload
        accept={accept}
        maxBytes={maxBytes}
        label="JSON Resume file"
        value={null}
        onFileSelect={mockOnFileSelect}
      />,
    );

    const file = new File(['x'.repeat(maxBytes + 1)], 'big.json', { type: 'application/json' });
    const input = screen.getByTestId('import-file-upload-input');
    await user.upload(input, file);

    expect(screen.getByTestId('import-file-upload-error')).toHaveTextContent(/too large/i);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('rejects wrong file type', () => {
    render(
      <ImportFileUpload
        accept={accept}
        maxBytes={maxBytes}
        label="JSON Resume file"
        value={null}
        onFileSelect={mockOnFileSelect}
      />,
    );

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const dropZone = screen.getByRole('button', { name: /drag and drop or browse/i });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByTestId('import-file-upload-error')).toHaveTextContent(/not supported/i);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('clears the selected file', async () => {
    const user = userEvent.setup({ delay: null });
    const file = new File(['{"basics":{}}'], 'resume.json', { type: 'application/json' });

    render(
      <ImportFileUpload
        accept={accept}
        maxBytes={maxBytes}
        label="JSON Resume file"
        value={file}
        onFileSelect={mockOnFileSelect}
      />,
    );

    await user.click(screen.getByTestId('import-file-upload-clear'));
    expect(mockOnFileSelect).toHaveBeenCalledWith(null);
  });

  it('accepts a valid dropped file', () => {
    render(
      <ImportFileUpload
        accept={accept}
        maxBytes={maxBytes}
        label="JSON Resume file"
        value={null}
        onFileSelect={mockOnFileSelect}
      />,
    );

    const file = new File(['{"basics":{}}'], 'resume.json', { type: 'application/json' });
    const dropZone = screen.getByRole('button', { name: /drag and drop or browse/i });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });
});
