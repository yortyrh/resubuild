'use client';

import { tagPillClassName } from '@/components/cv/tags-input';
import { cn } from '@/lib/utils';

interface TagsListProps {
  values: string[];
  className?: string;
}

export function TagsList({ values, className }: TagsListProps) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {values.map((tag, index) => (
        <span key={`${tag}-${index}`} className={tagPillClassName}>
          {tag}
        </span>
      ))}
    </div>
  );
}
