'use client';

import { memo, type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CV_PREVIEW_MIN_HEIGHT_PX,
  isCvPreviewResizeMessage,
  measureIframeDocumentHeight,
  withPreviewResizeReporter,
} from '@/app/dashboard/cv/[id]/preview/cv-preview-frame';

export interface CvPreviewIframeProps {
  html: string;
  frameRef?: RefObject<HTMLIFrameElement | null>;
  title?: string;
  className?: string;
}

export const CvPreviewIframe = memo(function CvPreviewIframe({
  html,
  frameRef,
  title = 'Resume preview',
  className,
}: CvPreviewIframeProps) {
  const [contentHeight, setContentHeight] = useState(CV_PREVIEW_MIN_HEIGHT_PX);
  const srcDoc = useMemo(() => withPreviewResizeReporter(html), [html]);

  const applyMeasuredHeight = useCallback((iframe: HTMLIFrameElement) => {
    const measured = measureIframeDocumentHeight(iframe);
    if (measured === null) {
      return;
    }
    setContentHeight(Math.max(CV_PREVIEW_MIN_HEIGHT_PX, Math.ceil(measured)));
  }, []);

  useEffect(() => {
    if (srcDoc) {
      setContentHeight(CV_PREVIEW_MIN_HEIGHT_PX);
    }
  }, [srcDoc]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const iframe = frameRef?.current;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
        return;
      }
      if (!isCvPreviewResizeMessage(event.data)) {
        return;
      }
      setContentHeight(Math.max(CV_PREVIEW_MIN_HEIGHT_PX, Math.ceil(event.data.height)));
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = event.currentTarget;
      applyMeasuredHeight(iframe);
      window.setTimeout(() => applyMeasuredHeight(iframe), 300);
    },
    [applyMeasuredHeight],
  );

  const frameHeight = contentHeight;

  return (
    <div
      className={className ?? 'surface-soft cv-export-preview w-full min-w-0 max-w-none flex-1'}
      style={{ height: frameHeight, minHeight: CV_PREVIEW_MIN_HEIGHT_PX }}
    >
      <iframe
        ref={frameRef}
        title={title}
        className="block w-full border-0 bg-white"
        style={{ height: frameHeight }}
        srcDoc={srcDoc}
        onLoad={handleLoad}
      />
    </div>
  );
});
