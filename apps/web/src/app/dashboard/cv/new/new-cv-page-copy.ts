export interface NewCvPageCopy {
  title: string;
  subtitle: string;
}

export const NEW_CV_PAGE_COPY: Record<string, NewCvPageCopy> = {
  '/dashboard/cv/new/create': {
    title: 'Create a CV manually',
    subtitle: 'Enter your basics to start a new CV. Nothing is saved until you click Save.',
  },
  '/dashboard/cv/new/import/pdf': {
    title: 'Import from PDF',
    subtitle:
      'Upload a PDF résumé and let the AI agent extract a JSON Resume. The CV is created when import succeeds.',
  },
  '/dashboard/cv/new/import/json': {
    title: 'Import JSON Resume',
    subtitle:
      'Upload a `.json` file or edit JSON directly. Review validation, then confirm to create your CV.',
  },
  '/dashboard/cv/new/import/website': {
    title: 'Import from website',
    subtitle:
      'Fetch JSON Resume data from a public HTTPS URL, including JSON Resume Registry profile links.',
  },
  '/dashboard/cv/new/import/markdown': {
    title: 'Import from Markdown',
    subtitle:
      'Upload a Markdown résumé and let the AI agent convert it to JSON Resume. The CV is created when import succeeds.',
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
