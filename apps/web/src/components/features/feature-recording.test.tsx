import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureRecording } from './feature-recording';

/** Stub window.matchMedia before tests that need it */
function stubMatchMedia(matches: boolean) {
  const stub = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: stub,
  });
}

describe('FeatureRecording', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
  });

  it('renders a video element by default (no reduced motion)', () => {
    stubMatchMedia(false);

    render(
      <FeatureRecording
        id="pdf-import"
        title="Import a PDF CV"
        caption="AI extracts resume data"
      />,
    );

    // Use querySelector for video element (jsdom doesn't map <video> to a named role)
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/recordings/pdf-import.mp4');
    expect(video).toHaveAttribute('poster', '/recordings/pdf-import.png');
    // Boolean attributes (autoplay, muted, loop, playsinline) are set as JS properties
    // in jsdom; check them via the element property
    expect((video as HTMLVideoElement).autoplay).toBe(true);
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect((video as HTMLVideoElement).loop).toBe(true);
    expect((video as HTMLVideoElement).playsInline).toBe(true);
  });

  it('renders a poster img when prefers-reduced-motion is set', () => {
    stubMatchMedia(true);

    render(
      <FeatureRecording
        id="editor-export"
        title="Edit and Export PDF"
        caption="MIT-format editor"
      />,
    );

    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/recordings/editor-export.png');
    expect(img).toHaveAttribute('alt', 'Edit and Export PDF demo');
  });

  it('renders title and caption', () => {
    stubMatchMedia(false);

    render(
      <FeatureRecording
        id="pdf-import"
        title="Import a PDF CV"
        caption="AI extracts resume data"
      />,
    );

    expect(screen.getByText('Import a PDF CV')).toBeInTheDocument();
    expect(screen.getByText('AI extracts resume data')).toBeInTheDocument();
  });
});
