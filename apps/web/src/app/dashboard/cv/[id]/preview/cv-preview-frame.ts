export const CV_PREVIEW_RESIZE_MESSAGE = 'cv-preview-resize';

export const CV_PREVIEW_MIN_HEIGHT_PX = 480;

function measurePreviewDocumentHeight(doc: Document): number | null {
  const body = doc.body;
  if (!body) {
    return null;
  }

  body.style.minHeight = '0';
  body.classList.remove('min-h-screen');

  const article = doc.querySelector('article');
  if (article) {
    const view = doc.defaultView;
    const styles = view?.getComputedStyle(article);
    const marginTop = Number.parseFloat(styles?.marginTop ?? '0') || 0;
    const marginBottom = Number.parseFloat(styles?.marginBottom ?? '0') || 0;
    return Math.ceil(article.offsetTop + article.offsetHeight + marginTop + marginBottom);
  }

  const root = doc.documentElement;
  return Math.max(root.scrollHeight, root.offsetHeight, body.scrollHeight, body.offsetHeight);
}

export function measureIframeDocumentHeight(iframe: HTMLIFrameElement): number | null {
  const doc = iframe.contentDocument;
  if (!doc) {
    return null;
  }
  return measurePreviewDocumentHeight(doc);
}

/** Injects a same-origin resize reporter for dashboard preview iframes only (not PDF export). */
export function withPreviewResizeReporter(html: string): string {
  if (html.includes('id="cv-preview-resize"')) {
    return html;
  }

  const script = `<script id="cv-preview-resize">(function(){var T=${JSON.stringify(CV_PREVIEW_RESIZE_MESSAGE)};function measure(){var b=document.body;if(!b){return 0;}b.style.minHeight='0';b.classList.remove('min-h-screen');var a=document.querySelector('article');if(a){var s=getComputedStyle(a);var mt=parseFloat(s.marginTop)||0;var mb=parseFloat(s.marginBottom)||0;return Math.ceil(a.offsetTop+a.offsetHeight+mt+mb);}var r=document.documentElement;return Math.max(r.scrollHeight,r.offsetHeight,b.scrollHeight,b.offsetHeight);}function send(){parent.postMessage({type:T,height:measure()},'*');}window.addEventListener('load',function(){send();setTimeout(send,0);setTimeout(send,300);});if(typeof ResizeObserver!=='undefined'){new ResizeObserver(send).observe(document.documentElement);}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(send);}send();})();</script>`;

  return html.replace('</body>', `${script}</body>`);
}

export function isCvPreviewResizeMessage(
  data: unknown,
): data is { type: typeof CV_PREVIEW_RESIZE_MESSAGE; height: number } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: string }).type === CV_PREVIEW_RESIZE_MESSAGE &&
    typeof (data as { height?: unknown }).height === 'number' &&
    Number.isFinite((data as { height: number }).height)
  );
}
