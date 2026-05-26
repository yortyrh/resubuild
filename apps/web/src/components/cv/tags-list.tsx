'use client';

import { LabeledMetadataRow } from '@/components/cv/metadata-field';
import { roleTagPillClassName, tagPillClassName } from '@/components/cv/tags-input';
import { cn } from '@/lib/utils';

export type TagsListVariant = 'default' | 'roles';

interface TagsListProps {
  values: string[];
  className?: string;
  label?: string;
  variant?: TagsListVariant;
}

function tagPillClassForVariant(variant: TagsListVariant): string {
  return variant === 'roles' ? roleTagPillClassName : tagPillClassName;
}

export function TagsList({ values, className, label, variant = 'default' }: TagsListProps) {
  if (values.length === 0) {
    return null;
  }

  const pillClassName = tagPillClassForVariant(variant);
  const tags = values.map((tag, index) => (
    <span key={`${tag}-${index}`} className={pillClassName}>
      {tag}
    </span>
  ));

  if (!label) {
    return <div className={cn('flex flex-wrap gap-2', className)}>{tags}</div>;
  }

  return (
    <LabeledMetadataRow label={label} className={className}>
      {tags}
    </LabeledMetadataRow>
  );
}
