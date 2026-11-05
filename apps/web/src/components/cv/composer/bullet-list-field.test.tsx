// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BulletListField, hasInlineMarkdown, splitPastedBullets } from './bullet-list-field';

afterEach(() => {
  cleanup();
});

function Harness({
  initial,
  onValues,
}: {
  initial: string[];
  onValues?: (values: string[]) => void;
}) {
  const [values, setValues] = useState(initial);
  return (
    <BulletListField
      label="Highlights"
      itemLabel="Highlight"
      values={values}
      onChange={(next) => {
        setValues(next);
        onValues?.(next);
      }}
    />
  );
}

function bullets(): HTMLTextAreaElement[] {
  return screen.getAllByRole('textbox') as HTMLTextAreaElement[];
}

function caretAt(node: HTMLTextAreaElement, position: number) {
  node.focus();
  node.setSelectionRange(position, position);
}

describe('BulletListField', () => {
  it('renders one plain text field per bullet, named by position', () => {
    render(<Harness initial={['First', 'Second']} />);

    expect(screen.getByRole('textbox', { name: 'Highlight 1 of 2' })).toHaveValue('First');
    expect(screen.getByRole('textbox', { name: 'Highlight 2 of 2' })).toHaveValue('Second');
  });

  it('splits the bullet at the caret on Enter and focuses the new bullet', () => {
    const onValues = vi.fn();
    render(<Harness initial={['Shipped v2 on time']} onValues={onValues} />);
    const [first] = bullets();
    caretAt(first!, 10);

    fireEvent.keyDown(first!, { key: 'Enter' });

    expect(onValues).toHaveBeenLastCalledWith(['Shipped v2', ' on time']);
    expect(document.activeElement).toBe(bullets()[1]);
  });

  it('inserts a new bullet after the current one, not at the end', () => {
    const onValues = vi.fn();
    render(<Harness initial={['A', 'C']} onValues={onValues} />);
    const [first] = bullets();
    caretAt(first!, 1);

    fireEvent.keyDown(first!, { key: 'Enter' });

    expect(onValues).toHaveBeenLastCalledWith(['A', '', 'C']);
  });

  it('does not submit the parent form on Enter', () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Harness initial={['A']} />
      </form>,
    );
    const [first] = bullets();
    caretAt(first!, 1);

    fireEvent.keyDown(first!, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('merges into the previous bullet on Backspace at the start', () => {
    const onValues = vi.fn();
    render(<Harness initial={['Led a team', ' of 6']} onValues={onValues} />);
    const second = bullets()[1]!;
    caretAt(second, 0);

    fireEvent.keyDown(second, { key: 'Backspace' });

    expect(onValues).toHaveBeenLastCalledWith(['Led a team of 6']);
    expect(document.activeElement).toBe(bullets()[0]);
    expect(bullets()[0]!.selectionStart).toBe('Led a team'.length);
  });

  it('moves a bullet with Alt+Arrow keys', () => {
    const onValues = vi.fn();
    render(<Harness initial={['A', 'B', 'C']} onValues={onValues} />);
    const second = bullets()[1]!;
    caretAt(second, 0);

    fireEvent.keyDown(second, { key: 'ArrowUp', altKey: true });

    expect(onValues).toHaveBeenLastCalledWith(['B', 'A', 'C']);
  });

  it('splits pasted multi-line text into bullets and strips list markers', () => {
    const onValues = vi.fn();
    render(<Harness initial={['']} onValues={onValues} />);
    const [first] = bullets();
    caretAt(first!, 0);

    fireEvent.paste(first!, {
      clipboardData: { getData: () => '- Built the API\n• Cut costs 30%\n\n3. Hired 4 engineers' },
    });

    expect(onValues).toHaveBeenLastCalledWith([
      'Built the API',
      'Cut costs 30%',
      'Hired 4 engineers',
    ]);
  });

  it('keeps each field bound to its own text after removing a middle bullet', () => {
    render(<Harness initial={['One', 'Two', 'Three']} />);
    const third = bullets()[2]!;

    fireEvent.click(screen.getByRole('button', { name: 'Remove highlight 2' }));

    expect(bullets().map((node) => node.value)).toEqual(['One', 'Three']);
    expect(bullets()[1]).toBe(third);
  });

  it('adds an empty bullet and focuses it', () => {
    render(<Harness initial={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add highlight' }));

    expect(bullets()).toHaveLength(1);
    expect(document.activeElement).toBe(bullets()[0]);
  });

  it('shows Markdown rendered while the bullet is not focused, raw while editing', () => {
    const { container } = render(<Harness initial={['Cut latency by **40%**']} />);

    expect(container.querySelector('strong')?.textContent).toBe('40%');

    bullets()[0]!.focus();
    fireEvent.focus(bullets()[0]!);

    expect(container.querySelector('strong')).toBeNull();
    expect(bullets()[0]).toHaveValue('Cut latency by **40%**');
  });
});

describe('bullet helpers', () => {
  it('detects inline Markdown', () => {
    expect(hasInlineMarkdown('Plain text, 40% faster')).toBe(false);
    expect(hasInlineMarkdown('Used **Go**')).toBe(true);
    expect(hasInlineMarkdown('See [docs](https://example.com)')).toBe(true);
    expect(hasInlineMarkdown('Wrote `kubectl` plugins')).toBe(true);
  });

  it('splits pasted lines', () => {
    expect(splitPastedBullets('* a\r\n* b')).toEqual(['a', 'b']);
  });
});
