import { describe, expect, it } from 'vitest';
import {
  CV_PREVIEW_RESIZE_MESSAGE,
  isCvPreviewResizeMessage,
  withPreviewResizeReporter,
} from './cv-preview-frame';

describe('cv-preview-frame', () => {
  it('injects resize reporter script once', () => {
    const html = '<html><body><p>Hi</p></body></html>';
    const once = withPreviewResizeReporter(html);
    const twice = withPreviewResizeReporter(once);

    expect(once).toContain('id="cv-preview-resize"');
    expect(once).toContain(CV_PREVIEW_RESIZE_MESSAGE);
    expect(twice).toBe(once);
  });

  it('recognizes resize postMessage payload', () => {
    expect(isCvPreviewResizeMessage({ type: CV_PREVIEW_RESIZE_MESSAGE, height: 900 })).toBe(true);
    expect(isCvPreviewResizeMessage({ type: 'other', height: 900 })).toBe(false);
  });
});
