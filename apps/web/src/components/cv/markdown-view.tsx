'use client';

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  value: string | undefined | null;
  variant?: 'block' | 'inline';
  className?: string;
}

function SafeLink(props: ComponentPropsWithoutRef<'a'>) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

/** Sanitize schema that preserves GFM strikethrough (<del>) and underline (<u>). */
const markdownSanitizeSchema: Parameters<typeof rehypeSanitize>[0] = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'del', // GFM strikethrough
    'u', // underline
  ],
  strip: [],
};

export function MarkdownView({ value, variant = 'block', className = '' }: MarkdownViewProps) {
  if (!value?.trim()) {
    return null;
  }

  // Block variant layers `@tailwindcss/typography` so headings, lists, links,
  // and other markdown elements pick up sensible defaults (the cover letter
  // editor is in `freeForm` mode, so headings like `## Greeting` are valid
  // there and need to be sized). The inline variant stays prose-free because
  // it renders inside highlight bullets where heavy prose spacing would
  // break the existing CV list layout.
  const proseClass = variant === 'block' ? 'prose prose-sm max-w-none' : '';
  const variantClass = variant === 'inline' ? 'markdown-view--inline' : '';
  const classes = `markdown-view ${proseClass} ${variantClass} ${className}`.trim();

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={{ a: SafeLink }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
