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
      <div className="absolute inset-0 flex flex-col gap-[6cqw] p-[8cqw]">
        <ThumbnailHeader variant={variant} />
        <div className={cn(variant === 'modern' ? 'space-y-[5.5cqw]' : 'space-y-[5cqw]')}>
          {SECTIONS.map((section, sectionIndex) => (
            <ThumbnailSection key={sectionIndex} variant={variant} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SkeletonSection {
  /** Heading bar width, in % of the available width. */
  headingWidth: number;
  /** Entry line widths, in %. The first line is drawn darker, like an entry title. */
  lines: number[];
}

/**
 * Fixed skeleton content. Sections deliberately differ in length so the page
 * reads like a real CV, and the total height (about 80cqw for the sections
 * plus 23cqw for the header) stays inside the 113cqw of usable page height,
 * so the last section is never cut off.
 */
const SECTIONS: SkeletonSection[] = [
  { headingWidth: 30, lines: [62, 94, 86] },
  { headingWidth: 36, lines: [56, 92, 88, 72] },
  { headingWidth: 24, lines: [48, 80] },
  { headingWidth: 28, lines: [58, 90, 66] },
];

const HEADING_STYLE: Record<CvThumbnailTemplateId, { align: 'center' | 'left'; rule: boolean }> = {
  classic: { align: 'center', rule: true },
  left: { align: 'left', rule: true },
  modern: { align: 'left', rule: false },
  tabular: { align: 'left', rule: false },
};

function ThumbnailSection({
  variant,
  section,
}: {
  variant: CvThumbnailTemplateId;
  section: SkeletonSection;
}) {
  const { align, rule } = HEADING_STYLE[variant];
  const isTabular = variant === 'tabular';

  const heading = (
    <div
      data-thumbnail-heading=""
      data-align={align}
      data-rule={String(rule)}
      className={cn(rule && 'border-page-ink-muted/40 border-b pb-[1.5cqw]', isTabular && 'w-1/4')}
    >
      <div
        className={cn(
          'rounded-sm',
          variant === 'modern' ? 'bg-page-ink/35 h-[2.2cqw]' : 'bg-page-ink/60 h-[2.8cqw]',
          align === 'center' && 'mx-auto',
        )}
        style={{ width: isTabular ? '80%' : `${section.headingWidth}%` }}
      />
    </div>
  );

  const lines = (
    <div className={cn('space-y-[1.6cqw]', isTabular && 'flex-1')}>
      {section.lines.map((width, lineIndex) => (
        <div
          key={lineIndex}
          data-thumbnail-line=""
          className={cn(
            'h-[2.2cqw] rounded-sm',
            lineIndex === 0 ? 'bg-page-ink-muted/45' : 'bg-page-ink-muted/25',
          )}
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );

  if (isTabular) {
    return (
      <div data-thumbnail-section="" className="flex items-start gap-[4cqw]">
        {heading}
        {lines}
      </div>
    );
  }

  return (
    <div data-thumbnail-section="" className="space-y-[2cqw]">
      {heading}
      {lines}
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
