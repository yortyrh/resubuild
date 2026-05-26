export interface CvTitleBasics {
  name?: string;
  label?: string;
}

const UNTITLED_CV = 'Untitled CV';

export function deriveCvTitleFromBasics(basics?: CvTitleBasics | null): string {
  const name = basics?.name?.trim() ?? '';
  const label = basics?.label?.trim() ?? '';

  if (name && label) {
    return `${name} — ${label}`;
  }

  if (name) {
    return name;
  }

  if (label) {
    return label;
  }

  return UNTITLED_CV;
}

export function deriveCvShortTitleFromBasics(basics?: CvTitleBasics | null): string {
  const name = basics?.name?.trim() ?? '';
  if (name) {
    return name;
  }

  return deriveCvTitleFromBasics(basics);
}
