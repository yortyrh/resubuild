import { cn } from '@/lib/utils';

export type CvThumbnailTemplateId = 'classic' | 'modern' | 'tabular' | 'left';

interface CvTemplateThumbnailProps {
  templateId: string;
  /** Optional class name to extend the outer wrapper styling. */
  className?: string;
  /** Accessible label for the thumbnail. Defaults to a generic "CV preview". */
  label?: string;
}

/**
 * Static, deterministic miniature of each visual CV template. Renders a
 * paper-shaped card that hints at the template's header layout and section
 * heading style so users can pick the right template at a glance — without
 * loading the full resume HTML for every card in the list.
 */
export function CvTemplateThumbnail({
  templateId,
  className,
  label = 'CV preview',
}: CvTemplateThumbnailProps) {
  const variant = normalizeTemplateId(templateId);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'bg-page text-page-ink-muted relative aspect-[8.5/11] w-full overflow-hidden rounded-sm shadow-[0_0_0_1px_hsl(var(--page-rule)),0_1px_2px_hsl(var(--shadow-ink)/0.06)] transition-shadow [container-type:inline-size]',
        className,
      )}
      data-template={variant}
    >
      <div className="absolute inset-0 flex flex-col gap-[5cqw] p-[8cqw] text-[4.2cqw] leading-tight">
        <ThumbnailHeader variant={variant} />
        <div className="mt-[3.3cqw] space-y-[4cqw]">
          {Array.from({ length: 5 }, (_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-[1.7cqw]">
              <span
                className={cn(
                  'block font-semibold tracking-wide',
                  variant === 'classic' || variant === 'left' ? 'uppercase' : 'normal-case',
                  variant === 'classic' &&
                    'border-page-ink-muted/40 border-b pb-[1.7cqw] text-center',
                  variant === 'left' && 'text-left',
                  variant === 'modern' && 'text-left font-light',
                  variant === 'tabular' && 'text-left',
                )}
              >
                Section
              </span>
              <div className="space-y-[1.7cqw]">
                {Array.from({ length: 3 }, (_, lineIndex) => (
                  <div
                    key={lineIndex}
                    className="bg-page-ink-muted/30 h-[2.2cqw] rounded-sm"
                    style={{ width: `${94 - ((lineIndex * 17 + sectionIndex * 9) % 30)}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeTemplateId(id: string): CvThumbnailTemplateId {
  if (id === 'modern' || id === 'tabular' || id === 'left') {
    return id;
  }
  return 'classic';
}

function ThumbnailHeader({ variant }: { variant: CvThumbnailTemplateId }) {
  if (variant === 'classic') {
    return (
      <div className="text-center">
        <div className="bg-page-ink/80 mx-auto h-[5cqw] w-3/5 rounded-sm" />
        <div className="bg-page-ink-muted/40 mx-auto mt-[3.3cqw] h-[3.3cqw] w-2/5 rounded-sm" />
        <div className="mt-[3.3cqw] flex justify-center gap-[3.3cqw]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-page-ink-muted/40 h-[2.2cqw] w-[10cqw] rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'modern') {
    return (
      <div className="border-page-ink-muted/30 border-b pb-[3.3cqw]">
        <div className="bg-page-ink/80 h-[5cqw] w-3/5 rounded-sm" />
        <div className="bg-page-ink-muted/40 mt-[3.3cqw] h-[3.3cqw] w-2/5 rounded-sm" />
        <div className="mt-[3.3cqw] flex gap-[3.3cqw]">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-page-ink-muted/40 h-[2.2cqw] w-[10cqw] rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'tabular') {
    return (
      <div className="border-page-ink-muted/30 flex items-start justify-between border-b pb-[3.3cqw]">
        <div className="flex-1 pr-[3.3cqw]">
          <div className="bg-page-ink/80 h-[5cqw] w-4/5 rounded-sm" />
          <div className="bg-page-ink-muted/40 mt-[3.3cqw] h-[3.3cqw] w-3/5 rounded-sm" />
        </div>
        <div className="w-1/3 space-y-[1.7cqw]">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-page-ink-muted/40 h-[2.2cqw] w-full rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  // left
  return (
    <div className="border-page-ink-muted/40 border-b pb-[3.3cqw]">
      <div className="bg-page-ink/80 h-[5cqw] w-3/5 rounded-sm" />
      <div className="bg-page-ink-muted/40 mt-[3.3cqw] h-[3.3cqw] w-2/5 rounded-sm" />
      <div className="mt-[3.3cqw] flex gap-[3.3cqw]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-page-ink-muted/40 h-[2.2cqw] w-[10cqw] rounded-sm" />
        ))}
      </div>
    </div>
  );
}
