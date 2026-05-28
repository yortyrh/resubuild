import { escapeHtml } from './html';

export const PDF_EXPORT_OPTIONS = {
  format: 'Letter' as const,
  printBackground: true,
  margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
};

export interface DocumentOptions {
  title: string;
  body: string;
  bodyClass?: string;
  articleClass?: string;
  extraStyles?: string;
  dataTemplate?: string;
}

/** Wrap rendered section HTML in a full printable HTML document. */
export function wrapDocument(options: DocumentOptions): string {
  const {
    title,
    body,
    bodyClass = 'min-h-screen bg-neutral-100 print:bg-white',
    articleClass = 'max-w-[8.5in] mx-auto my-6 print:my-0 bg-white text-neutral-900 font-resume text-[11pt] leading-snug shadow-sm print:shadow-none p-[0.5in] print:p-0 text-pretty',
    extraStyles = '',
    dataTemplate,
  } = options;

  const dataAttr = dataTemplate ? ` data-template="${escapeHtml(dataTemplate)}"` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              resume: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
            },
          },
        },
      };
    </script>
    <style>
      @media print {
        @page {
          margin: 0.5in;
        }
        .no-print {
          display: none !important;
        }
      }
      ${extraStyles}
    </style>
  </head>
  <body class="${bodyClass}"${dataAttr}>
    <article class="${articleClass}">
      ${body}
    </article>
  </body>
</html>`;
}
