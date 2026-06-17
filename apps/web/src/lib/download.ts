/**
 * Trigger a browser download for the given blob. Works in all modern browsers
 * and gracefully handles environments where `URL.createObjectURL` is not
 * available (e.g. tests).
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
