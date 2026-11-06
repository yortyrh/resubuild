// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleScrollSectionFormIntoView, scrollSectionFormIntoView } from './focus-section-form';

describe('scrollSectionFormIntoView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('scrolls the form into view smoothly and never focuses a field', () => {
    const scrollIntoView = vi.fn();
    const form = document.createElement('form');
    Object.defineProperty(form, 'scrollIntoView', { value: scrollIntoView, configurable: true });

    const first = document.createElement('input');
    const second = document.createElement('input');
    form.append(first, second);
    document.body.append(form);

    const focusFirst = vi.spyOn(first, 'focus');
    const focusSecond = vi.spyOn(second, 'focus');
    const focusForm = vi.spyOn(form, 'focus');

    scrollSectionFormIntoView(form);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(focusFirst).not.toHaveBeenCalled();
    expect(focusSecond).not.toHaveBeenCalled();
    expect(focusForm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('does not throw when scrollIntoView is unavailable', () => {
    const form = document.createElement('form');
    Object.defineProperty(form, 'scrollIntoView', { value: undefined, configurable: true });
    expect(() => scrollSectionFormIntoView(form)).not.toThrow();
  });
});

describe('scheduleScrollSectionFormIntoView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls on the next animation frame, not synchronously', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const scrollIntoView = vi.fn();
    const form = document.createElement('form');
    Object.defineProperty(form, 'scrollIntoView', { value: scrollIntoView, configurable: true });

    scheduleScrollSectionFormIntoView(form);
    expect(scrollIntoView).not.toHaveBeenCalled();

    callbacks[0]!(0);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('does nothing for a null form', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    scheduleScrollSectionFormIntoView(null);
    expect(raf).not.toHaveBeenCalled();
  });
});
