// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportCvForm, MAX_IMPORT_FILE_BYTES } from './import-cv-form';

vi.mock('@/components/cv/json-resume-editor', () => ({
  formatJsonForEditor: (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return '';
    }
    try {
      return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`;
    } catch {
      return text;
    }
  },
  JsonResumeEditor: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <textarea
      aria-label="JSON source"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/lib/import-cv-media', () => ({
  checkImportableMediaUrl: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/import-cv-preview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/import-cv-preview')>();
  return {
    ...actual,
    probeExternalImageUrl: vi.fn().mockResolvedValue(false),
  };
});

async function openEditJsonDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Edit JSON…' }));
}

async function saveEditJsonDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

describe('ImportCvForm', () => {
  const mockOnImport = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not call onImport on mount', () => {
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('does not show the JSON editor on the main form', () => {
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    expect(screen.queryByLabelText('JSON source')).not.toBeInTheDocument();
  });

  it('disables Import for invalid JSON and shows an error', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await openEditJsonDialog(user);

    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: { value: '{ not json' },
    });
    await saveEditJsonDialog(user);

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON file')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('disables Import for schema-invalid JSON and lists schema errors', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await openEditJsonDialog(user);

    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: {
        value: JSON.stringify({
          basics: { name: 'Alex', email: 'not-an-email' },
        }),
      },
    });
    await saveEditJsonDialog(user);

    await waitFor(() => {
      expect(screen.getByText(/does not match the JSON Resume schema/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Fix these schema issues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('enables Import for valid JSON saved from the dialog', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await openEditJsonDialog(user);

    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: {
        value: JSON.stringify({ basics: { name: 'Alex' } }),
      },
    });
    await saveEditJsonDialog(user);

    await waitFor(() => {
      expect(screen.getByText(/JSON Resume file is valid/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  it('loads chosen file content and validates without showing the editor', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const payload = { basics: { name: 'From file' } };
    const file = new File([JSON.stringify(payload)], 'resume.json', {
      type: 'application/json',
    });
    const input = screen.getByTestId('import-file-upload-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('resume.json')).toBeInTheDocument();
      expect(screen.getByText(/JSON Resume file is valid/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('JSON source')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  it('discards dialog edits when canceled', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const payload = { basics: { name: 'From file' } };
    const file = new File([JSON.stringify(payload)], 'resume.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByTestId('import-file-upload-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/JSON Resume file is valid/i)).toBeInTheDocument();
    });

    await openEditJsonDialog(user);
    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: { value: JSON.stringify({ basics: { name: 'Changed' } }) },
    });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Changed/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  it('shows Gravatar option when profile photo URL is missing', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await openEditJsonDialog(user);

    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: {
        value: JSON.stringify({
          basics: { name: 'Alex', email: 'alex@example.com' },
        }),
      },
    });
    await saveEditJsonDialog(user);

    await waitFor(() => {
      expect(screen.getByLabelText(/Use Gravatar profile photo/i)).toBeInTheDocument();
    });
  });

  it('rejects oversized files before import', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const bigContent = 'x'.repeat(MAX_IMPORT_FILE_BYTES + 1);
    const file = new File([bigContent], 'big.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-file-upload-input'), file);

    await waitFor(() => {
      expect(screen.getByTestId('import-file-upload-error')).toHaveTextContent(/too large/i);
    });
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('calls onImport with prepared data and Gravatar choice', async () => {
    mockOnImport.mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });
    render(<ImportCvForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await openEditJsonDialog(user);

    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: {
        value: JSON.stringify({
          basics: { name: 'Alex', email: 'alex@example.com' },
        }),
      },
    });
    await saveEditJsonDialog(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
    });

    await user.click(screen.getByLabelText(/Use Gravatar profile photo/i));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledTimes(1);
    });
    expect(mockOnImport).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basics: expect.objectContaining({ name: 'Alex', email: 'alex@example.com' }),
      }),
      useGravatar: true,
    });
  });
});
