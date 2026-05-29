// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollAndFocusSectionForm } from './focus-section-form';

describe('scrollAndFocusSectionForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls the form into view and focuses the first input', () => {
    const scrollIntoView = vi.fn();
    const form = document.createElement('form');
    Object.defineProperty(form, 'scrollIntoView', { value: scrollIntoView, configurable: true });

    const first = document.createElement('input');
    const second = document.createElement('input');
    form.append(first, second);

    const focus = vi.spyOn(first, 'focus');

    scrollAndFocusSectionForm(form);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
