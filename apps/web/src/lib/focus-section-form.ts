/**
 * Scroll a section form into view. It deliberately does not focus any field:
 * focusing the first one opens selection widgets (comboboxes) on its own.
 */
export function scrollSectionFormIntoView(form: HTMLElement): void {
  if (typeof form.scrollIntoView === 'function') {
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/** Run the scroll after the form has painted (e.g. after React state opens create mode). */
export function scheduleScrollSectionFormIntoView(form: HTMLElement | null): void {
  if (!form) {
    return;
  }
  requestAnimationFrame(() => {
    scrollSectionFormIntoView(form);
  });
}
