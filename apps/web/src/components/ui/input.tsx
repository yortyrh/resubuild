import * as React from 'react';
import { cn } from '@/lib/utils';

type InputProps = Omit<React.ComponentProps<'input'>, 'value'> & {
  value?: React.ComponentProps<'input'>['value'] | null;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-input bg-background placeholder:text-muted-foreground/80 hover:border-foreground/30 focus-visible:border-primary focus-visible:ring-primary/25 flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
        {...(value !== undefined ? { value: value ?? '' } : {})}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
