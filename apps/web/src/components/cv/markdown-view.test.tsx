import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './markdown-view';

describe('MarkdownView', () => {
  it('renders bold text as <strong>', () => {
    const { container } = render(<MarkdownView value="Hello **world**" />);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('world');
  });

  it('renders italic text as <em>', () => {
    const { container } = render(<MarkdownView value="Hello *italic*" />);
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('italic');
  });

  it('renders unordered list items', () => {
    const md = `- item one
- item two`;
    const { container } = render(<MarkdownView value={md} />);
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toBe('item one');
    expect(items[1]?.textContent).toBe('item two');
  });

  it('renders ordered list items', () => {
    const md = `1. first
2. second`;
    const { container } = render(<MarkdownView value={md} />);
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('returns null for empty string', () => {
    const { container } = render(<MarkdownView value="" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for whitespace-only string', () => {
    const { container } = render(<MarkdownView value="   " />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for undefined', () => {
    const { container } = render(<MarkdownView value={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for null', () => {
    const { container } = render(<MarkdownView value={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('sanitizes javascript: links by removing href', () => {
    const { container } = render(<MarkdownView value='[click me](javascript:alert("xss"))' />);
    const link = container.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      expect(href === null || !href.includes('javascript:')).toBe(true);
    }
  });

  it('sanitizes script tags in raw HTML', () => {
    const { container } = render(
      <MarkdownView value={'<script>alert("xss")</script>\n\nsafe text'} />,
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders links with target=_blank and rel=noopener noreferrer', () => {
    const { container } = render(<MarkdownView value="[Google](https://google.com)" />);
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('applies markdown-view class in block mode', () => {
    const { container } = render(<MarkdownView value="hello" variant="block" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains('markdown-view')).toBe(true);
    expect(el?.classList.contains('markdown-view--inline')).toBe(false);
  });

  it('layers @tailwindcss/typography prose classes on the block variant so headings size correctly', () => {
    const { container } = render(<MarkdownView value="hello" variant="block" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains('prose')).toBe(true);
    expect(el?.classList.contains('prose-sm')).toBe(true);
    // `max-w-none` strips the default `prose` 65ch cap so the cover letter
    // preview uses the full width of the scrollable tab wrapper.
    expect(el?.classList.contains('max-w-none')).toBe(true);
  });

  it('does not layer prose classes on the inline variant (highlight bullets)', () => {
    const { container } = render(<MarkdownView value="hello" variant="inline" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains('prose')).toBe(false);
    expect(el?.classList.contains('prose-sm')).toBe(false);
    expect(el?.classList.contains('max-w-none')).toBe(false);
  });

  it('applies markdown-view--inline class in inline mode', () => {
    const { container } = render(<MarkdownView value="hello" variant="inline" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains('markdown-view')).toBe(true);
    expect(el?.classList.contains('markdown-view--inline')).toBe(true);
  });

  it('renders a table from GFM syntax', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const { container } = render(<MarkdownView value={md} />);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelectorAll('td').length).toBe(2);
  });

  it('renders blockquotes', () => {
    const { container } = render(<MarkdownView value="> quoted text" />);
    const bq = container.querySelector('blockquote');
    expect(bq).not.toBeNull();
    expect(bq?.textContent).toContain('quoted text');
  });
});
