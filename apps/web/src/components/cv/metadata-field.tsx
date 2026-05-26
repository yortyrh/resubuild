'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const metadataLabelClassName =
  'text-muted-foreground bg-muted/60 inline-flex min-h-7 shrink-0 items-center justify-center rounded px-2 py-1 text-xs font-medium uppercase tracking-wide';

export const metadataRowClassName = 'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm';

export const metadataFieldGroupClassName = 'mt-3 flex flex-col gap-3';

interface MetadataLabelProps {
  children: ReactNode;
  className?: string;
}

export function MetadataLabel({ children, className }: MetadataLabelProps) {
  return <span className={cn(metadataLabelClassName, className)}>{children}</span>;
}

interface LabeledMetadataRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function LabeledMetadataRow({ label, children, className }: LabeledMetadataRowProps) {
  return (
    <div className={cn(metadataRowClassName, className)}>
      <MetadataLabel>{label}</MetadataLabel>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

interface MetadataFieldGroupProps {
  children: ReactNode;
  className?: string;
}

export function MetadataFieldGroup({ children, className }: MetadataFieldGroupProps) {
  return <div className={cn(metadataFieldGroupClassName, className)}>{children}</div>;
}

interface MetadataTextFieldProps {
  label: string;
  value?: string | null;
  className?: string;
}

export function MetadataTextField({ label, value, className }: MetadataTextFieldProps) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <LabeledMetadataRow label={label} className={className}>
      <span className="font-normal">{value}</span>
    </LabeledMetadataRow>
  );
}
