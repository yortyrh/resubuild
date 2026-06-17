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
        'border-input/40 bg-background text-muted-foreground relative aspect-[8.5/11] w-full overflow-hidden rounded-md border shadow-sm',
        className,
      )}
      data-template={variant}
    >
      <div className="absolute inset-0 flex flex-col gap-1.5 p-2 text-[5px] leading-tight">
        <ThumbnailHeader variant={variant} />
        <div className="mt-1 space-y-1">
          {Array.from({ length: 3 }, (_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-0.5">
              <span
                className={cn(
                  'block font-semibold tracking-wide',
                  variant === 'classic' || variant === 'left' ? 'uppercase' : 'normal-case',
                  variant === 'classic' && 'border-muted-foreground/40 border-b pb-0.5 text-center',
                  variant === 'left' && 'text-left',
                  variant === 'modern' && 'text-left font-light',
                  variant === 'tabular' && 'text-left',
                )}
              >
                Section
              </span>
              <div className="space-y-[2px]">
                {Array.from({ length: 2 }, (_, lineIndex) => (
                  <div
                    key={lineIndex}
                    className="bg-muted-foreground/30 h-[3px] rounded-sm"
                    style={{ width: `${90 - lineIndex * 12}%` }}
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
        <div className="bg-foreground/80 mx-auto h-1.5 w-3/5 rounded-sm" />
        <div className="bg-muted-foreground/40 mx-auto mt-1 h-1 w-2/5 rounded-sm" />
        <div className="mt-1 flex justify-center gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-muted-foreground/40 h-[3px] w-3 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'modern') {
    return (
      <div className="border-muted-foreground/30 border-b pb-1">
        <div className="bg-foreground/80 h-1.5 w-3/5 rounded-sm" />
        <div className="bg-muted-foreground/40 mt-1 h-1 w-2/5 rounded-sm" />
        <div className="mt-1 flex gap-1">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-muted-foreground/40 h-[3px] w-3 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'tabular') {
    return (
      <div className="border-muted-foreground/30 flex items-start justify-between border-b pb-1">
        <div className="flex-1 pr-1">
          <div className="bg-foreground/80 h-1.5 w-4/5 rounded-sm" />
          <div className="bg-muted-foreground/40 mt-1 h-1 w-3/5 rounded-sm" />
        </div>
        <div className="w-1/3 space-y-[2px]">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-muted-foreground/40 h-[3px] w-full rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  // left
  return (
    <div className="border-muted-foreground/40 border-b pb-1">
      <div className="bg-foreground/80 h-1.5 w-3/5 rounded-sm" />
      <div className="bg-muted-foreground/40 mt-1 h-1 w-2/5 rounded-sm" />
      <div className="mt-1 flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted-foreground/40 h-[3px] w-3 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
