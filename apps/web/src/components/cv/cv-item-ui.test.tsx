// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeItemForm, ResumeItemRow, SectionCreateForm } from './cv-item-ui';

beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 1;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pressEscape(target: EventTarget = document.body, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('ResumeItemForm', () => {
  it('does not focus any field when opened', () => {
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    const form = screen.getByRole('form', { name: 'Edit entry' });
    expect(form.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('scrolls itself into view without focusing', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('cancels on Escape even when focus is outside the form', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    expect(document.activeElement).toBe(document.body);
    const event = pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('cancels on Escape from inside a field', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores keys other than Escape', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    pressEscape(document.body, { key: 'Enter' });
    pressEscape(document.body, { key: 'Esc' });
    pressEscape(document.body, { key: 'a' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not cancel while saving', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm saving onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    const event = pressEscape();
    expect(onCancel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('cancels again once saving finishes', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <ResumeItemForm saving onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    rerender(
      <ResumeItemForm saving={false} onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel when Escape was already handled (defaultPrevented)', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    const input = screen.getByLabelText('Name');
    input.addEventListener('keydown', (e) => e.preventDefault());
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const onCancel = vi.fn();
    const { unmount } = render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    unmount();
    const event = pressEscape();
    expect(onCancel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('calls the latest onCancel after a rerender', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <ResumeItemForm onSave={vi.fn()} onCancel={first}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    rerender(
      <ResumeItemForm onSave={vi.fn()} onCancel={second}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    pressEscape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cancels via the Cancel button', () => {
    const onCancel = vi.fn();
    render(
      <ResumeItemForm onSave={vi.fn()} onCancel={onCancel}>
        <input aria-label="Name" />
      </ResumeItemForm>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('SectionCreateForm', () => {
  function Harness({ onCancel }: { onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <SectionCreateForm
        label="Add skill"
        open={open}
        onOpen={() => setOpen(true)}
        onSave={vi.fn()}
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
      >
        <input aria-label="Name" />
      </SectionCreateForm>
    );
  }

  it('does not focus any field when opened', () => {
    render(<Harness onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    const form = screen.getByRole('form', { name: 'Add skill' });
    expect(form.contains(document.activeElement)).toBe(false);
  });

  it('cancels on Escape with focus outside the form', () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    (document.activeElement as HTMLElement | null)?.blur();
    pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('does not react to Escape while closed', () => {
    const onCancel = vi.fn();
    render(
      <SectionCreateForm
        label="Add skill"
        open={false}
        onOpen={vi.fn()}
        onSave={vi.fn()}
        onCancel={onCancel}
      >
        <input />
      </SectionCreateForm>,
    );
    pressEscape();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not cancel on Escape while saving', () => {
    const onCancel = vi.fn();
    render(
      <SectionCreateForm
        label="Add skill"
        open
        saving
        onOpen={vi.fn()}
        onSave={vi.fn()}
        onCancel={onCancel}
      >
        <input />
      </SectionCreateForm>,
    );
    pressEscape();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('ResumeItemRow highlighted', () => {
  it('has no data-highlighted or outline by default and does not scroll', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    const { container } = render(
      <ResumeItemRow title="Acme" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const article = container.querySelector('article')!;
    expect(article.hasAttribute('data-highlighted')).toBe(false);
    expect(article.className).not.toContain('outline-2');
    expect(scroll).not.toHaveBeenCalled();
  });

  it('marks the article and scrolls it into view when highlighted', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    const { container } = render(
      <ResumeItemRow title="Acme" highlighted onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const article = container.querySelector('article')!;
    expect(article.hasAttribute('data-highlighted')).toBe(true);
    expect(article.className).toContain('outline');
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('removes the mark when highlighted turns false', () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const { container, rerender } = render(
      <ResumeItemRow title="Acme" highlighted onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    rerender(
      <ResumeItemRow title="Acme" highlighted={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const article = container.querySelector('article')!;
    expect(article.hasAttribute('data-highlighted')).toBe(false);
    expect(article.className).not.toContain('outline-2');
  });
});

describe('ResumeItemRow onHighlightDismiss', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('calls it on pointerdown outside the article while highlighted', () => {
    const onDismiss = vi.fn();
    render(
      <ResumeItemRow
        title="Acme"
        highlighted
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.pointerDown(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call it for a pointerdown inside the article', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <ResumeItemRow
        title="Acme"
        highlighted
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.pointerDown(container.querySelector('article')!);
    fireEvent.pointerDown(screen.getByRole('button', { name: /edit/i }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not listen when not highlighted', () => {
    const onDismiss = vi.fn();
    render(
      <ResumeItemRow
        title="Acme"
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.pointerDown(document.body);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not throw when the callback is absent', () => {
    render(<ResumeItemRow title="Acme" highlighted onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(() => fireEvent.pointerDown(document.body)).not.toThrow();
  });

  it('stops listening after un-highlight and after unmount', () => {
    const onDismiss = vi.fn();
    const { rerender, unmount } = render(
      <ResumeItemRow
        title="Acme"
        highlighted
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    rerender(
      <ResumeItemRow
        title="Acme"
        highlighted={false}
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.pointerDown(document.body);
    expect(onDismiss).not.toHaveBeenCalled();

    rerender(
      <ResumeItemRow
        title="Acme"
        highlighted
        onHighlightDismiss={onDismiss}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    unmount();
    fireEvent.pointerDown(document.body);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
