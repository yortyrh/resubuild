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
  markdownShortcutPlugin,
  quotePlugin,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import type { FC } from 'react';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
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

export function MarkdownEditorImpl({
  value = '',
  onChange,
  variant = 'block',
  placeholder,
  className,
}: MarkdownEditorProps) {
  return (
    <div
      className={cn(
        'rich-text-editor',
        variant === 'inline' && 'rich-text-editor--inline',
        className,
      )}
    >
      <MDXEditor
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
}

export default MarkdownEditorImpl;
