// Server component. PDF → CV transformation mock using the existing
// landing-animations.css keyframes as the page's signature visual.

export function HeroVisual() {
  return (
    <div className="relative">
      <div className="landing-hero-mock-glow" aria-hidden="true" />
      <div className="landing-hero-mock relative">
        <div className="landing-hero-mock-header">
          <span className="landing-hero-mock-dot" style={{ background: '#ef4444' }} />
          <span className="landing-hero-mock-dot" style={{ background: '#f59e0b' }} />
          <span className="landing-hero-mock-dot" style={{ background: '#22c55e' }} />
          <span className="ml-2">Resubuild — Import preview</span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--landing-muted)]">
              Source PDF
            </p>
            <div className="landing-pdf-mock landing-pdf-column">
              <div className="landing-mock-line landing-mock-line--accent" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line landing-mock-line--short" />
              <div className="landing-mock-line mt-3" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line landing-mock-line--short" />
              <div className="landing-mock-line landing-mock-line--green mt-3" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line landing-mock-line--short" />
              <div className="landing-scanline" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--landing-muted)]">
              Structured CV
            </p>
            <div className="landing-cv-mock landing-cv-column">
              <p className="mb-2 text-sm font-semibold text-[var(--landing-primary-600)]">
                Jane Developer
              </p>
              <p className="mb-3 text-xs text-[var(--landing-muted)]">Senior Software Engineer</p>
              <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--landing-muted)]">
                Experience
              </p>
              <div className="landing-mock-line landing-mock-line--accent" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line landing-mock-line--short" />
              <p className="mb-1 mt-3 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--landing-muted)]">
                Skills
              </p>
              <div className="landing-mock-line landing-mock-line--green" />
              <div className="landing-mock-line landing-mock-line--short" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-3 text-xs text-[var(--landing-muted)]">
          <span className="landing-pulse-dot" aria-hidden="true" />
          Extraction complete — ready to edit
        </div>
      </div>
    </div>
  );
}
