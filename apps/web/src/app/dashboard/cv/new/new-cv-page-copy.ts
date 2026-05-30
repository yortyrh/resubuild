export interface NewCvPageCopy {
  title: string;
  subtitle: string;
}

export const NEW_CV_PAGE_COPY: Record<string, NewCvPageCopy> = {
  '/dashboard/cv/new/create': {
    title: 'Create a CV manually',
    subtitle: 'Enter your basics to start a new CV. Nothing is saved until you click Save.',
  },
  '/dashboard/cv/new/import/file': {
    title: 'Import from file',
    subtitle:
      'Upload a JSON Resume, PDF, or Markdown file. JSON is validated locally; PDF and Markdown are converted by the AI agent before you confirm import.',
  },
  '/dashboard/cv/new/import/url': {
    title: 'Import from URL',
    subtitle:
      'Paste a public HTTPS résumé URL. JSON endpoints import immediately; HTML pages are converted by the AI agent.',
  },
};

export function getNewCvPageCopy(pathname: string): NewCvPageCopy {
  return (
    NEW_CV_PAGE_COPY[pathname] ?? {
      title: 'Create a new CV',
      subtitle: 'Choose how you want to create or import your CV.',
    }
  );
}
