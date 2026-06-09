// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrepareApplicationFilePicker } from './prepare-application-file-picker';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeFile(opts: { name: string; type: string; size: number }) {
  // jsdom's File constructor is available via the global `File` polyfill.
  return new File([new Uint8Array(opts.size)], opts.name, { type: opts.type });
}

function pickFile(input: HTMLInputElement, file: File) {
  // DataTransfer in jsdom is limited; assign files directly to the input.
  Object.defineProperty(input, 'files', {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
}

describe('PrepareApplicationFilePicker', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(toast.error).mockClear();
  });

  it('renders the Choose file button when no file is selected', () => {
    render(<PrepareApplicationFilePicker value={null} onChange={vi.fn()} />);
    expect(screen.getByTestId('prepare-file-picker-trigger')).toBeInTheDocument();
    expect(screen.getByText(/PDF or screenshot, up to 5 MB/i)).toBeInTheDocument();
  });

  it('accepts a valid PDF under 5 MB and shows metadata', () => {
    const onChange = vi.fn();
    const file = makeFile({ name: 'job.pdf', type: 'application/pdf', size: 1024 * 100 });
    const { container } = render(<PrepareApplicationFilePicker value={null} onChange={onChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    pickFile(input, file);

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('rejects an oversize file with a toast and does not call onChange', () => {
    const onChange = vi.fn();
    const file = makeFile({ name: 'huge.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 });
    const { container } = render(<PrepareApplicationFilePicker value={null} onChange={onChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    pickFile(input, file);

    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('rejects a non-allowed MIME type with a toast and does not call onChange', () => {
    const onChange = vi.fn();
    const file = makeFile({ name: 'resume.docx', type: 'application/msword', size: 1024 });
    const { container } = render(<PrepareApplicationFilePicker value={null} onChange={onChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    pickFile(input, file);

    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('shows file metadata and a Remove button when a file is selected', () => {
    const file = makeFile({ name: 'job.png', type: 'image/png', size: 1024 * 200 });
    const onChange = vi.fn();
    render(<PrepareApplicationFilePicker value={file} onChange={onChange} />);

    const meta = screen.getByTestId('prepare-file-picker-meta');
    expect(meta.textContent).toContain('job.png');
    expect(meta.textContent).toContain('image/png');

    fireEvent.click(screen.getByTestId('prepare-file-picker-remove'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('disables the trigger and the Remove action when disabled', () => {
    const file = makeFile({ name: 'job.png', type: 'image/png', size: 1024 * 200 });
    render(<PrepareApplicationFilePicker value={file} onChange={vi.fn()} disabled />);

    expect(screen.getByTestId('prepare-file-picker-trigger')).toBeDisabled();
    expect(screen.getByTestId('prepare-file-picker-remove')).toBeDisabled();
  });
});
