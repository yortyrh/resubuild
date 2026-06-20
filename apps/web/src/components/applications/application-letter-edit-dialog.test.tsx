// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationLetterEditDialog } from './application-letter-edit-dialog';

const mockUpdateApplicationLetter = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    updateApplicationLetter: (...args: unknown[]) => mockUpdateApplicationLetter(...args),
  };
});

const editorValueHistory: string[] = [];
const editorPropsHistory: { freeForm?: boolean }[] = [];

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    freeForm,
  }: {
    value: string;
    onChange: (next: string) => void;
    freeForm?: boolean;
  }) => {
    editorValueHistory.push(value);
    editorPropsHistory.push({ freeForm });
    return (
      <div data-testid="mock-editor" data-free-form={freeForm ? 'true' : 'false'}>
        <span data-testid="editor-value">{value}</span>
        <button type="button" data-testid="simulate-edit" onClick={() => onChange('Edited body')}>
          edit
        </button>
      </div>
    );
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const readyApplication = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Senior Engineer',
  jobCompany: 'Acme',
  coverLetter: 'Initial body',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderDialog(props: {
  initialValue?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = props.onOpenChange ?? vi.fn();
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={client}>
        <ApplicationLetterEditDialog
          applicationId="app-1"
          open={props.open ?? true}
          onOpenChange={onOpenChange}
          initialValue={props.initialValue ?? 'Initial body'}
        />
      </QueryClientProvider>,
    ),
  };
}

describe('ApplicationLetterEditDialog', () => {
  beforeEach(() => {
    editorValueHistory.length = 0;
    editorPropsHistory.length = 0;
    mockUpdateApplicationLetter.mockResolvedValue({
      ...readyApplication,
      coverLetter: 'Edited body',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('seeds the editor with the initial value when opened', () => {
    renderDialog({});

    expect(editorValueHistory).toContain('Initial body');
    expect(screen.getByTestId('editor-value')).toHaveTextContent('Initial body');
  });

  it('calls updateApplicationLetter with the edited value and closes on save', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({});

    await user.click(screen.getByTestId('simulate-edit'));
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateApplicationLetter).toHaveBeenCalledWith('app-1', 'Edited body');
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not save when the dialog is rendered closed (mutation never fires)', () => {
    renderDialog({ open: false });

    expect(mockUpdateApplicationLetter).not.toHaveBeenCalled();
    // The mock editor is gated by `open` (via `renderMarkdown`), and the Save
    // button is inside the Radix portal which only mounts when open is true.
    expect(screen.queryByTestId('mock-editor')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('does not render the markdown editor when initialValue is an empty string', () => {
    renderDialog({ initialValue: '' });

    expect(screen.queryByTestId('mock-editor')).not.toBeInTheDocument();
    expect(editorValueHistory).not.toContain('');
  });

  it('does not render the markdown editor when initialValue is only whitespace', () => {
    renderDialog({ initialValue: '   \n\t  ' });

    expect(screen.queryByTestId('mock-editor')).not.toBeInTheDocument();
  });

  it('renders the markdown editor again once initialValue becomes non-empty', () => {
    const { rerender } = render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationLetterEditDialog
          applicationId="app-1"
          open
          onOpenChange={vi.fn()}
          initialValue=""
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('mock-editor')).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationLetterEditDialog
          applicationId="app-1"
          open
          onOpenChange={vi.fn()}
          initialValue="Now we have a body"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
    expect(screen.getByTestId('editor-value')).toHaveTextContent('Now we have a body');
  });

  it('seeds the editor with markdown containing headings without mangling it', () => {
    const initialValue = '## Some heading\nSome text';
    renderDialog({ initialValue });

    // The dialog passes the value through unchanged so MDXEditor's `markdown`
    // prop receives the full `## ` prefix; the headings plugin (registered via
    // `freeForm`) is what turns that prefix into an <h2> at render time.
    expect(editorValueHistory).toContain(initialValue);
    // Strip the newline so we can match against the DOM-normalized text node.
    expect(screen.getByTestId('editor-value')).toHaveTextContent('## Some heading Some text');
  });

  it('opens the editor in free-form mode so headings render as headings', () => {
    renderDialog({});

    // The cover letter surface accepts the full markdown grammar (headings,
    // code blocks), distinct from the CV section editor which keeps its
    // constrained plugin list. Asserting `freeForm=true` here pins the choice
    // so a future regression that drops the prop would fail this test.
    expect(screen.getByTestId('mock-editor')).toHaveAttribute('data-free-form', 'true');
    expect(editorPropsHistory.at(-1)?.freeForm).toBe(true);
  });
});
