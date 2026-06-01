import * as React from 'react';
import { cn } from '@/lib/utils';

type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'value'> & {
  value?: React.ComponentProps<'textarea'>['value'] | null;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
        {...(value !== undefined ? { value: value ?? '' } : {})}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
