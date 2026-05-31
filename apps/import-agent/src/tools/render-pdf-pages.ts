import { createCanvas } from '@napi-rs/canvas';

const MAX_OCR_PAGES = 10;
const RENDER_SCALE = 2;

export async function renderPdfPagesToPng(
  pdfBuffer: Buffer,
  maxPages = MAX_OCR_PAGES,
): Promise<{ images: Buffer[]; pageCount: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const pageCount = pdf.numPages;
  const pagesToRender = Math.min(pageCount, maxPages);
  const images: Buffer[] = [];

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as never,
      viewport,
      canvas: canvas as never,
    }).promise;

    images.push(canvas.toBuffer('image/png'));
    page.cleanup();
  }

  return { images, pageCount };
}
