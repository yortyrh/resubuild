export interface PdfLink {
  url: string;
  /** Text under the link area (e.g. "LinkedIn" for an icon link); may be empty. */
  text: string;
}

const MAX_LINK_PAGES = 10;
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

type PdfTextItem = { str?: string; transform?: number[] };

function isAllowedUrl(raw: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(raw).protocol);
  } catch {
    return false;
  }
}

/**
 * Read link annotations from a PDF. Résumé templates often hide profile URLs
 * behind icons or short labels ("LinkedIn"), so the Markdown text alone loses
 * them. Best effort: returns [] when the PDF cannot be parsed.
 */
export async function extractPdfLinks(
  pdfBuffer: Buffer,
  maxPages = MAX_LINK_PAGES,
): Promise<PdfLink[]> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;

    const links: PdfLink[] = [];
    const seen = new Set<string>();
    const pages = Math.min(pdf.numPages, maxPages);

    for (let pageNum = 1; pageNum <= pages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const annotations = (await page.getAnnotations()) as Array<{
        subtype?: string;
        url?: string;
        unsafeUrl?: string;
        rect?: number[];
      }>;
      const linkAnnotations = annotations.filter((annotation) => annotation.subtype === 'Link');
      if (linkAnnotations.length === 0) {
        page.cleanup();
        continue;
      }

      const textItems = (await page.getTextContent()).items as PdfTextItem[];
      for (const annotation of linkAnnotations) {
        const url = (annotation.url ?? annotation.unsafeUrl ?? '').trim();
        if (!url || seen.has(url) || !isAllowedUrl(url)) continue;
        seen.add(url);

        const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = annotation.rect ?? [];
        const text = textItems
          .filter((item) => {
            const [, , , , x = Number.NaN, y = Number.NaN] = item.transform ?? [];
            return item.str && x >= x1 - 2 && x <= x2 + 2 && y >= y1 - 4 && y <= y2 + 4;
          })
          .map((item) => item.str)
          .join('')
          .replace(/\s+/g, ' ')
          .trim();

        links.push({ url, text });
      }
      page.cleanup();
    }

    await loadingTask.destroy().catch(() => {
      // Best-effort cleanup.
    });
    return links;
  } catch {
    return [];
  }
}

/**
 * Append the PDF's links that the extracted text does not already contain, as
 * a Markdown list the drafting model can map to profiles/URLs.
 */
export function appendPdfLinks(text: string, links: PdfLink[]): string {
  const missing = links.filter((link) => !text.includes(link.url));
  if (missing.length === 0) {
    return text;
  }

  const lines = missing.map((link) =>
    link.text ? `- [${link.text.replace(/[[\]]/g, '')}](${link.url})` : `- <${link.url}>`,
  );
  return `${text}\n\n## Links in the document\n\n${lines.join('\n')}`;
}
