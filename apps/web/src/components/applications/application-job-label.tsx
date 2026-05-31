import { cn } from '@/lib/utils';

interface ApplicationJobLabelProps {
  jobTitle?: string | null;
  jobCompany?: string | null;
  /** Page title (`h1`) or compact label for back links. */
  variant?: 'heading' | 'compact';
  showBackArrow?: boolean;
  className?: string;
}

export function ApplicationJobLabel({
  jobTitle,
  jobCompany,
  variant = 'heading',
  showBackArrow = false,
  className,
}: ApplicationJobLabelProps) {
  const title = jobTitle ?? 'Application';
  const company = jobCompany?.trim();
  const back = showBackArrow ? '← ' : '';

  const titleClass =
    variant === 'heading' ? 'text-2xl font-semibold' : 'text-sm font-medium leading-snug';
  const subtitleClass =
    variant === 'heading'
      ? 'text-muted-foreground mt-0.5 text-xs sm:text-sm'
      : 'text-muted-foreground text-[10px] sm:text-xs font-normal leading-snug';
  const desktopCompanyClass =
    variant === 'heading'
      ? 'text-muted-foreground text-sm sm:text-base lg:text-lg font-normal'
      : 'text-muted-foreground text-[10px] sm:text-xs md:text-sm font-normal';
  const desktopHeadingClass = 'hidden sm:block';
  const desktopCompactClass = 'hidden min-w-0 truncate sm:block';

  if (!company) {
    const text = `${back}${title}`;
    if (variant === 'heading') {
      return <h1 className={cn(titleClass, className)}>{text}</h1>;
    }
    return <span className={cn(titleClass, 'min-w-0 truncate', className)}>{text}</span>;
  }

  if (variant === 'heading') {
    return (
      <div className={className}>
        <h1 className={cn(titleClass, 'sm:hidden')}>{title}</h1>
        <p className={cn(subtitleClass, 'sm:hidden')}>{company}</p>
        <h1 className={cn(titleClass, desktopHeadingClass)}>
          {title}
          <span className={desktopCompanyClass}> · {company}</span>
        </h1>
      </div>
    );
  }

  const fullLabel = `${title} · ${company}`;

  return (
    <span className={cn('min-w-0', className)} title={fullLabel}>
      <span className="min-w-0 sm:hidden">
        <span className={cn(titleClass, 'block')}>
          {back}
          {title}
        </span>
        <span className={cn(subtitleClass, 'block')}>{company}</span>
      </span>
      <span className={cn(desktopCompactClass, titleClass)}>
        {back}
        {title}
        <span className={desktopCompanyClass}> · {company}</span>
      </span>
    </span>
  );
}
