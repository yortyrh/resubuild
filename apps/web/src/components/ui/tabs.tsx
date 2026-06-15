import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabs is built on Radix's `TabsPrimitive.Root` but adds a grid-stacking
 * layout so every `TabsContent` panel overlaps in the same cell.
 *
 * Without this, switching between tabs (for example, the Password / Email
 * code / Email link tabs on the login page) changes the card height and
 * causes the centered card to jump vertically. With the grid pattern, the
 * row reserves the tallest panel's height, so the surrounding card stays
 * pinned to its centered position.
 */
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root ref={ref} className={cn('grid grid-cols-1', className)} {...props} />
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'bg-muted text-muted-foreground inline-flex h-10 flex-wrap items-center justify-center rounded-md p-1',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * TabsContent is pinned to row 2 / column 1 of the Tabs grid so every panel
 * overlaps in the same cell. Inactive panels stay mounted (so the cell sizes
 * to the tallest one) but are visually hidden and non-interactive.
 *
 * `forceMount` defaults to `true`; pass `forceMount={false}` to fall back to
 * Radix's default unmount-on-inactive behaviour, which would break the
 * grid-stacking layout.
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, forceMount = true, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    forceMount={forceMount}
    className={cn(
      'ring-offset-background focus-visible:ring-ring mt-4 focus-visible:outline-none focus-visible:ring-2',
      'col-start-1 row-start-2',
      'data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
