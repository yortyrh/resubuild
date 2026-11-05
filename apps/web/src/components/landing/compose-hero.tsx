'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

const TYPED = 'Cut checkout latency by 40% by moving pricing to the edge';

const existing = [
  'Led a team of six through the payments platform migration',
  'Wrote the on-call guide used by four product teams',
];

/**
 * The hero's proof strip: an old CV, the same entry in the page editor, and the
 * printed page. One highlight is typed in the editor and appears on the page as
 * it is typed. With reduced motion, both show the finished text.
 */
export function ComposeHero() {
  const [typed, setTyped] = useState(TYPED.length);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setTyped(0);
    setRunning(true);
    let index = 0;
    let timer = 0;
    const tick = () => {
      index += 1;
      setTyped(index);
      if (index < TYPED.length) {
        timer = window.setTimeout(tick, 38 + Math.random() * 50);
      } else {
        timer = window.setTimeout(() => setRunning(false), 1400);
      }
    };
    timer = window.setTimeout(tick, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const text = TYPED.slice(0, typed);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.25fr)_minmax(0,1fr)] md:gap-5">
      <figure className="flex flex-col gap-3">
        <div
          aria-hidden
          className="bg-card relative flex aspect-[4/5] flex-col gap-2 overflow-hidden rounded-lg p-5 shadow-[0_0_0_1px_hsl(var(--border))] md:aspect-auto md:h-full"
        >
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <FileText className="size-4" />
            ana-castillo-cv-2019-final(3).pdf
          </div>
          <div className="mt-3 h-3 w-1/2 rounded-sm bg-[hsl(var(--foreground)/0.7)]" />
          <div className="h-2 w-1/3 rounded-sm bg-[hsl(var(--foreground)/0.25)]" />
          <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3">
            <div className="space-y-1.5 rounded-sm bg-[hsl(var(--primary)/0.12)] p-2">
              {[70, 90, 55, 80, 60].map((width) => (
                <div
                  key={width}
                  className="h-1.5 rounded-sm bg-[hsl(var(--primary)/0.35)]"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
            <div className="space-y-1.5">
              {[95, 80, 88, 60, 92, 74, 85, 50].map((width, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative lines
                  key={index}
                  className="h-1.5 rounded-sm bg-[hsl(var(--foreground)/0.18)]"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <figcaption className="text-muted-foreground text-sm">
          The CV you have: a PDF, Word file, image, or link.
        </figcaption>
      </figure>

      <figure className="flex flex-col gap-3">
        <div
          aria-hidden
          className="cv-paper ring-primary/45 h-full p-5 text-[0.875rem] leading-[1.45] ring-2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p>
              <span className="font-bold">Northwind Logistics</span>, Remote
            </p>
            <p className="text-page-ink-muted shrink-0 text-[0.75rem]">2021 – Present</p>
          </div>
          <p className="italic">Staff Engineer, Checkout</p>
          <p className="text-page-ink-muted mb-1 mt-3 font-sans text-[0.6875rem] font-medium">
            Highlights
          </p>
          <ul className="space-y-1">
            <li className="flex gap-2">
              <span className="w-3 shrink-0 text-center">•</span>
              <span className="min-w-0 flex-1 rounded-[3px] bg-[hsl(var(--primary)/0.05)] px-1 shadow-[inset_0_-2px_0_hsl(var(--primary))]">
                {text}
                {running ? <span className="compose-caret" /> : null}
              </span>
            </li>
            {existing.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="w-3 shrink-0 text-center">•</span>
                <span className="min-w-0 flex-1 px-1">{line}</span>
              </li>
            ))}
          </ul>
          <p className="text-page-ink-muted mt-2 pl-5 font-sans text-[0.75rem]">+ Add highlight</p>
        </div>
        <figcaption className="text-muted-foreground text-sm">
          Each field sits where it prints. Enter starts the next bullet.
        </figcaption>
      </figure>

      <figure className="flex flex-col gap-3">
        <div aria-hidden className="cv-paper h-full px-5 py-5 text-[0.75rem] leading-[1.45]">
          <p className="text-center text-base font-bold tracking-tight">Ana Castillo</p>
          <p className="text-center">Senior Product Engineer</p>
          <p className="border-page-rule mt-3 border-b pb-0.5 text-[0.6875rem] font-bold">
            Experience
          </p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p>
              <span className="font-bold">Northwind Logistics</span>, Remote
            </p>
            <p className="text-page-ink-muted shrink-0">2021 – Present</p>
          </div>
          <p className="italic">Staff Engineer, Checkout</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {text ? <li className={running ? 'compose-arrive' : undefined}>{text}</li> : null}
            {existing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="border-page-rule mt-3 border-b pb-0.5 text-[0.6875rem] font-bold">
            Education
          </p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p className="font-bold">University of Porto</p>
            <p className="text-page-ink-muted shrink-0">2013 – 2017</p>
          </div>
        </div>
        <figcaption className="text-muted-foreground text-sm">
          The page you export as PDF, set the same way.
        </figcaption>
      </figure>
    </div>
  );
}
