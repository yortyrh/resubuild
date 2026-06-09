// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiAgentActive } from '@/lib/queries/ai-agent-queries';
import { PrepareApplicationForm } from './prepare-application-form';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: [] }),
  };
});

// Lightweight shim for the heavy MDXEditor bundle. Tests only need to assert
// presence/absence of the editor surface and that onChange propagates.
vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="md-editor"
      data-placeholder={placeholder ?? ''}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function mockAgent(configured: boolean) {
  vi.mocked(useAiAgentActive).mockReturnValue({
    data: { configured },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAiAgentActive>);
}

describe('PrepareApplicationForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('gates intake on active AI agent account', () => {
    mockAgent(false);
    render(<PrepareApplicationForm />);
    expect(screen.getByText(/Configure an active AI agent account/i)).toBeInTheDocument();
  });

  it('renders the Job source modes in a single segmented row', () => {
    mockAgent(true);
    render(<PrepareApplicationForm />);

    const group = screen.getByTestId('source-mode-group');
    const urlBtn = within(group).getByTestId('source-mode-url');
    const textBtn = within(group).getByTestId('source-mode-text');
    const fileBtn = within(group).getByTestId('source-mode-file');

    expect(urlBtn).toHaveAttribute('aria-pressed', 'false');
    expect(textBtn).toHaveAttribute('aria-pressed', 'true');
    expect(fileBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('swaps the input panel when the user changes the source mode', () => {
    mockAgent(true);
    render(<PrepareApplicationForm />);

    const group = screen.getByTestId('source-mode-group');
    const urlBtn = within(group).getByTestId('source-mode-url');
    const fileBtn = within(group).getByTestId('source-mode-file');

    // Default is Text — Markdown editor is mounted inside the Job source fieldset
    // (it's a sibling of the segmented row, not a child).
    expect(screen.getAllByTestId('md-editor').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('source-input-url')).not.toBeInTheDocument();

    // Switch to URL — Input is mounted, editor for the source is unmounted.
    fireEvent.click(urlBtn);
    expect(screen.getByTestId('source-input-url')).toBeInTheDocument();
    // The Optional instruction editor is still mounted, so we count by role+testid carefully.
    // After switching, the form's job-source md-editor should be gone — the only
    // remaining md-editor is the Optional instruction one.
    const editors = screen.getAllByTestId('md-editor');
    expect(editors).toHaveLength(1);
    expect(editors[0]).toHaveAttribute('data-placeholder', 'Emphasize React experience…');

    // Switch to File — file picker is mounted, URL input is gone.
    fireEvent.click(fileBtn);
    expect(screen.getByTestId('prepare-file-picker-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('source-input-url')).not.toBeInTheDocument();
  });
});
