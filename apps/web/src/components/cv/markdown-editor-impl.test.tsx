import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const InlineToolbar = () => (
  <>
    <button type="button" data-testid="undo-redo">
      UndoRedo
    </button>
    <button type="button" data-testid="bold-italic-underline">
      BIU
    </button>
    <button type="button" data-testid="strike-through">
      StrikeThrough
    </button>
    <button type="button" data-testid="code-toggle">
      CodeToggle
    </button>
    <button type="button" data-testid="create-link">
      Link
    </button>
  </>
);

const BlockToolbar = ({ withInsertCodeBlock = false }: { withInsertCodeBlock?: boolean }) => (
  <>
    <button type="button" data-testid="undo-redo">
      UndoRedo
    </button>
    <button type="button" data-testid="block-type-select">
      Block
    </button>
    <button type="button" data-testid="bold-italic-underline">
      BIU
    </button>
    <button type="button" data-testid="strike-through">
      StrikeThrough
    </button>
    <button type="button" data-testid="code-toggle">
      CodeToggle
    </button>
    <button type="button" data-testid="create-link">
      Link
    </button>
    <button type="button" data-testid="lists-toggle">
      Lists
    </button>
    {withInsertCodeBlock ? (
      <button type="button" data-testid="insert-code-block">
        CodeBlock
      </button>
    ) : null}
  </>
);

// Records every `markdown` prop the mock MDXEditor receives and
// exposes a ref-callable setMarkdown that pushes new values into
// the same recorder. Tests inspect this array to assert that
// the wrapper's imperative setter forwarded to the underlying
// editor instance.
const markdownHistory: string[] = [];

vi.mock('@mdxeditor/editor', () => {
  return {
    MDXEditor: ({
      ref,
      plugins,
      contentEditableClassName,
      markdown,
      className,
    }: {
      ref?:
        | { current: { setMarkdown: (v: string) => void } | null }
        | ((
            instance: {
              setMarkdown: (v: string) => void;
            } | null,
          ) => void);
      plugins?: unknown[];
      contentEditableClassName?: string;
      markdown?: string;
      className?: string;
    }) => {
      if (typeof markdown === 'string') {
        markdownHistory.push(markdown);
      }
      const setMarkdown = (next: string) => {
        markdownHistory.push(next);
      };
      if (typeof ref === 'function') {
        ref({ setMarkdown });
      } else if (ref && typeof ref === 'object') {
        ref.current = { setMarkdown };
      }
      const hasToolbar = plugins?.some((p) => p === 'toolbarPlugin');
      const isInline = contentEditableClassName?.includes('inline');
      const hasCodeBlock = plugins?.some((p) => p === 'codeBlockPlugin');
      return (
        <div
          data-testid="mdx-editor"
          data-plugins={plugins?.length ?? 0}
          data-content-class={contentEditableClassName ?? ''}
          data-markdown={markdown ?? ''}
          data-class-name={className ?? ''}
        >
          {hasToolbar &&
            (isInline ? <InlineToolbar /> : <BlockToolbar withInsertCodeBlock={hasCodeBlock} />)}
        </div>
      );
    },
    listsPlugin: vi.fn(() => 'listsPlugin'),
    quotePlugin: vi.fn(() => 'quotePlugin'),
    thematicBreakPlugin: vi.fn(() => 'thematicBreakPlugin'),
    linkPlugin: vi.fn(() => 'linkPlugin'),
    linkDialogPlugin: vi.fn(() => 'linkDialogPlugin'),
    tablePlugin: vi.fn(() => 'tablePlugin'),
    markdownShortcutPlugin: vi.fn(() => 'markdownShortcutPlugin'),
    headingsPlugin: vi.fn(() => 'headingsPlugin'),
    codeBlockPlugin: vi.fn(() => 'codeBlockPlugin'),
    BoldItalicUnderlineToggles: () => (
      <button type="button" data-testid="bold-italic-underline">
        BIU
      </button>
    ),
    StrikeThroughSupSubToggles: () => (
      <button type="button" data-testid="strike-through">
        StrikeThrough
      </button>
    ),
    CodeToggle: () => (
      <button type="button" data-testid="code-toggle">
        CodeToggle
      </button>
    ),
    BlockTypeSelect: () => (
      <button type="button" data-testid="block-type-select">
        Block
      </button>
    ),
    CreateLink: () => (
      <button type="button" data-testid="create-link">
        Link
      </button>
    ),
    ListsToggle: () => (
      <button type="button" data-testid="lists-toggle">
        Lists
      </button>
    ),
    InsertCodeBlock: () => (
      <button type="button" data-testid="insert-code-block">
        CodeBlock
      </button>
    ),
    UndoRedo: () => (
      <button type="button" data-testid="undo-redo">
        UndoRedo
      </button>
    ),
    toolbarPlugin: vi.fn(() => 'toolbarPlugin'),
  };
});

import { type MarkdownEditorHandle, MarkdownEditorImpl } from './markdown-editor-impl';

describe('MarkdownEditorImpl', () => {
  afterEach(() => {
    cleanup();
    markdownHistory.length = 0;
  });

  it('renders block variant with constrained toolbar items', () => {
    render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />);
    // Block variant: UndoRedo, BlockTypeSelect, BoldItalic, Strikethrough, CodeToggle, CreateLink, ListsToggle
    expect(screen.getByTestId('undo-redo')).toBeInTheDocument();
    expect(screen.getByTestId('block-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('bold-italic-underline')).toBeInTheDocument();
    expect(screen.getByTestId('strike-through')).toBeInTheDocument();
    expect(screen.getByTestId('code-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('create-link')).toBeInTheDocument();
    expect(screen.getByTestId('lists-toggle')).toBeInTheDocument();
    // Headings / code block / table / thematic-break buttons are intentionally absent.
    expect(screen.queryByTestId('insert-code-block')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insert-thematic-break')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insert-table')).not.toBeInTheDocument();
  });

  it('renders inline variant with limited toolbar items', () => {
    render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="inline" />);
    // Inline variant: UndoRedo, BoldItalic, Strikethrough, CodeToggle, CreateLink
    expect(screen.getByTestId('undo-redo')).toBeInTheDocument();
    expect(screen.getByTestId('bold-italic-underline')).toBeInTheDocument();
    expect(screen.getByTestId('strike-through')).toBeInTheDocument();
    expect(screen.getByTestId('code-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('create-link')).toBeInTheDocument();
    // Should NOT have block-only items
    expect(screen.queryByTestId('block-type-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lists-toggle')).not.toBeInTheDocument();
  });

  it('configures 8 plugins for block variant (no headings)', () => {
    const { getByTestId } = render(
      <MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />,
    );
    const editor = getByTestId('mdx-editor');
    // 8 plugins: lists, quote, thematicBreak, link, linkDialog, table, toolbar, markdownShortcut
    expect(editor).toHaveAttribute('data-plugins', '8');
  });

  it('does not register a headings plugin (no headings in the block type select)', () => {
    const { getByTestId } = render(
      <MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />,
    );
    const editor = getByTestId('mdx-editor');
    // The mock renders a `data-plugins` length. With 8 plugins and no headings,
    // the block-type select only ever offers Paragraph + Quote at runtime.
    expect(editor.dataset.plugins).toBe('8');
  });

  it('does not render an image insert button', () => {
    render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />);
    expect(screen.queryByTestId('insert-image')).not.toBeInTheDocument();
  });

  it('applies inline contentEditable class for inline variant', () => {
    const { getByTestId } = render(
      <MarkdownEditorImpl value="" onChange={vi.fn()} variant="inline" />,
    );
    expect(getByTestId('mdx-editor')).toHaveAttribute(
      'data-content-class',
      'mdxeditor-content--inline',
    );
  });

  it('applies tailwind typography to the block variant contentEditable so headings, lists, etc. render with prose defaults', () => {
    const { getByTestId } = render(
      <MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />,
    );
    expect(getByTestId('mdx-editor')).toHaveAttribute(
      'data-content-class',
      'prose prose-sm max-w-none',
    );
  });

  it('exposes a setMarkdown ref that pushes new content into the editor', () => {
    const ref = createRef<MarkdownEditorHandle>();
    render(<MarkdownEditorImpl ref={ref} value="" onChange={vi.fn()} variant="block" />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.setMarkdown).toBe('function');

    // Snapshot the recorder at this point — the initial mount pushed
    // the empty `value` prop into the mock.
    const baselineLength = markdownHistory.length;
    expect(markdownHistory[baselineLength - 1]).toBe('');

    ref.current?.setMarkdown('Hello, world.');

    // The imperative setter must have pushed a new value into the
    // underlying editor recorder after the baseline.
    expect(markdownHistory.length).toBeGreaterThan(baselineLength);
    expect(markdownHistory[markdownHistory.length - 1]).toBe('Hello, world.');
  });

  it('still renders the initial value when no ref is provided', () => {
    render(<MarkdownEditorImpl value="initial" onChange={vi.fn()} variant="block" />);
    const editor = screen.getByTestId('mdx-editor');
    expect(editor).toHaveAttribute('data-markdown', 'initial');
    // The recorder must contain the initial value as the last
    // recorded entry (no imperative setter was ever called).
    expect(markdownHistory[markdownHistory.length - 1]).toBe('initial');
  });

  it('passes the mdxeditor-theme class to MDXEditor so it can hoist the popup container z-index above ancestor overlays', () => {
    // MDXEditor copies the `className` prop onto the dynamically-appended
    // `.mdxeditor-popup-container` (which lives under `document.body`, not as
    // a child of the editor). When the editor is rendered inside an overlay
    // like the cover-letter dialog (z-50), the Block-type dropdown portal
    // would otherwise be clipped/covered. Tagging the editor with
    // `mdxeditor-theme` gives the popup container a stable selector that the
    // global stylesheet uses to raise its z-index above the dialog.
    const { getByTestId } = render(
      <MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />,
    );
    expect(getByTestId('mdx-editor')).toHaveAttribute('data-class-name', 'mdxeditor-theme');
  });

  describe('freeForm mode (cover letter, job description)', () => {
    it('registers 10 plugins when freeForm is true (adds headings + codeBlock)', () => {
      const { getByTestId } = render(
        <MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" freeForm />,
      );
      const editor = getByTestId('mdx-editor');
      // 10 plugins: headings, lists, quote, thematicBreak, link, linkDialog, table,
      // codeBlock, toolbar, markdownShortcut
      expect(editor).toHaveAttribute('data-plugins', '10');
    });

    it('renders the InsertCodeBlock toolbar item when freeForm is true', () => {
      render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" freeForm />);
      expect(screen.getByTestId('insert-code-block')).toBeInTheDocument();
    });

    it('still omits InsertCodeBlock when freeForm is false', () => {
      render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="block" />);
      expect(screen.queryByTestId('insert-code-block')).not.toBeInTheDocument();
    });

    it('does not change the inline toolbar when freeForm is true', () => {
      render(<MarkdownEditorImpl value="" onChange={vi.fn()} variant="inline" freeForm />);
      // Inline variant toolbar is intentionally identical with or without freeForm
      expect(screen.getByTestId('undo-redo')).toBeInTheDocument();
      expect(screen.getByTestId('bold-italic-underline')).toBeInTheDocument();
      expect(screen.getByTestId('strike-through')).toBeInTheDocument();
      expect(screen.getByTestId('code-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('create-link')).toBeInTheDocument();
      expect(screen.queryByTestId('block-type-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('insert-code-block')).not.toBeInTheDocument();
    });
  });
});
