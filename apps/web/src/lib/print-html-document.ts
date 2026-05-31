/** Opens the browser print dialog for a complete HTML document string. */
export function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;clip:rect(0,0,0,0);';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    throw new Error('Print frame unavailable');
  }

  const cleanup = () => {
    iframe.remove();
  };

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
  };

  if (frameWindow.document.readyState === 'complete') {
    triggerPrint();
  } else {
    iframe.onload = triggerPrint;
  }

  frameWindow.onafterprint = cleanup;
  window.setTimeout(cleanup, 60_000);
}
