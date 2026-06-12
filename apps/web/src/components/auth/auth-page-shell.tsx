import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AuthPageShellProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Centered auth card layout shared by login, register, and related flows. */
export function AuthPageShell({ title, description, children, footer }: AuthPageShellProps) {
  return (
    <div className="flex min-h-dvh min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {children ?? null}
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}
