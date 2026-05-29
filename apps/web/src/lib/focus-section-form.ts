const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

/** Scroll a section form into view and focus its first editable field. */
export function scrollAndFocusSectionForm(form: HTMLElement): void {
  if (typeof form.scrollIntoView === 'function') {
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const field = form.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  field?.focus({ preventScroll: true });
}

/** Run scroll/focus after the form has painted (e.g. after React state opens create mode). */
export function scheduleScrollAndFocusSectionForm(form: HTMLElement | null): void {
  if (!form) {
    return;
  }
  requestAnimationFrame(() => {
    scrollAndFocusSectionForm(form);
  });
}
