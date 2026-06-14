'use client';

import { useEffect, useState } from 'react';

interface HeroVideoProps {
  /** Path to the MP4 recording, e.g. "/recordings/showcase.mp4" */
  src?: string;
  /** Path to the poster PNG, e.g. "/recordings/showcase.png" */
  poster?: string;
}

export function HeroVideo({
  src = '/recordings/showcase.mp4',
  poster = '/recordings/showcase.png',
}: HeroVideoProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (prefersReducedMotion) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="Resubuild demo" className="w-full rounded-xl" />;
  }

  return (
    <video
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      className="w-full rounded-xl"
      aria-label="Resubuild demo: import a PDF, edit your CV, export a polished resume"
    />
  );
}
