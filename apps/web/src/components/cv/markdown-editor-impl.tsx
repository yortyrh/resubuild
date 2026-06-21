'use client';

import '@mdxeditor/editor/style.css';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  codeBlockPlugin,
  headingsPlugin,
  InsertCodeBlock,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  type MDXEditorMethods,
  markdownShortcutPlugin,
  quotePlugin,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import { type FC, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
  /**
   * Opt into the full markdown grammar (headings, code blocks). Off by default so
   * CV section fields keep their constrained grammar; enable on long-form
   * authoring surfaces like the cover letter or job description.
   */
  freeForm?: boolean;
}

export interface MarkdownEditorHandle {
  setMarkdown: (value: string) => void;
}

type ToolbarContentsProps = Pick<MarkdownEditorProps, 'variant' | 'freeForm'>;

const ToolbarContents: FC<ToolbarContentsProps> = ({ variant, freeForm = false }) => {
  if (variant === 'inline') {
    return (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
        <StrikeThroughSupSubToggles options={['Strikethrough']} />
        <CodeToggle />
        <CreateLink />
      </>
    );
  }
  return (
    <>
      <UndoRedo />
      <BlockTypeSelect />
      <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
      <StrikeThroughSupSubToggles options={['Strikethrough']} />
      <CodeToggle />
      <CreateLink />
      <ListsToggle options={['bullet', 'number']} />
      {freeForm ? <InsertCodeBlock /> : null}
    </>
  );
};

export const MarkdownEditorImpl = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditorImpl(
    { value = '', onChange, variant = 'block', placeholder, className, freeForm = false },
    ref,
  ) {
    const editorRef = useRef<MDXEditorMethods>(null);

    const plugins = useMemo(() => {
      const basePlugins = [
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        toolbarPlugin({
          toolbarContents: () => <ToolbarContents variant={variant} freeForm={freeForm} />,
        }),
        markdownShortcutPlugin(),
      ];
      return freeForm ? [headingsPlugin(), codeBlockPlugin(), ...basePlugins] : basePlugins;
    }, [variant, freeForm]);

    useImperativeHandle(
      ref,
      () => ({
        setMarkdown(next) {
          editorRef.current?.setMarkdown(next);
        },
      }),
      [],
    );

    return (
      <div
        className={cn(
          'rich-text-editor',
          variant === 'inline' && 'rich-text-editor--inline',
          className,
        )}
      >
        <MDXEditor
          ref={editorRef}
          markdown={value}
          onChange={onChange}
          placeholder={placeholder}
          contentEditableClassName={cn(
            variant === 'inline' && 'mdxeditor-content--inline',
            variant === 'block' && 'prose prose-sm max-w-none',
          )}
          plugins={plugins}
        />
      </div>
    );
  },
);

export default MarkdownEditorImpl;
