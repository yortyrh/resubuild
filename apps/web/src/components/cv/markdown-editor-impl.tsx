'use client';

import '@mdxeditor/editor/style.css';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
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
import { type FC, forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
}

export interface MarkdownEditorHandle {
  setMarkdown: (value: string) => void;
}

type ToolbarContentsProps = Pick<MarkdownEditorProps, 'variant'>;

const ToolbarContents: FC<ToolbarContentsProps> = ({ variant }) => {
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
    </>
  );
};

export const MarkdownEditorImpl = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditorImpl(
    { value = '', onChange, variant = 'block', placeholder, className },
    ref,
  ) {
    const editorRef = useRef<MDXEditorMethods>(null);

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
          contentEditableClassName={cn(variant === 'inline' && 'mdxeditor-content--inline')}
          plugins={[
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            tablePlugin(),
            toolbarPlugin({ toolbarContents: () => <ToolbarContents variant={variant} /> }),
            markdownShortcutPlugin(),
          ]}
        />
      </div>
    );
  },
);

export default MarkdownEditorImpl;
