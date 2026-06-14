'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';

export interface FeatureRecordingProps {
  /** Unique identifier matching the recording filename, e.g. "pdf-import" */
  id: string;
  /** Short heading for this feature */
  title: string;
  /** One-line description of the feature */
  caption: string;
  /** Optional className to pass to the wrapper */
  className?: string;
}

export function FeatureRecording({ id, title, caption, className }: FeatureRecordingProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <div className="border-border bg-surface-soft relative overflow-hidden rounded-xl border">
        {prefersReducedMotion ? (
          // Reduced motion: show static poster image only
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/recordings/${id}.png`}
            alt={`${title} demo`}
            className="w-full object-cover"
          />
        ) : (
          <video
            src={`/recordings/${id}.mp4`}
            poster={`/recordings/${id}.png`}
            autoPlay
            muted
            loop
            playsInline
            className="w-full object-cover"
            aria-label={`${title} demo`}
          />
        )}
      </div>
      <div>
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{caption}</p>
      </div>
    </div>
  );
}
