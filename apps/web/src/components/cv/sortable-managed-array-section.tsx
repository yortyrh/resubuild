'use client';

import {
  ManagedArraySection,
  type ManagedArraySectionProps,
} from '@/components/cv/managed-array-section';
import type { ReorderableCvSection } from '@/lib/cv-item-api';
import type { WithItemId } from '@/lib/cv-section-order';

export type SortableManagedArraySectionProps<T extends WithItemId> = ManagedArraySectionProps<T> & {
  reorderSection: ReorderableCvSection;
  /** Accessible section name, e.g. "skill" for move-up labels. */
  reorderSectionLabel: string;
};

export function SortableManagedArraySection<T extends WithItemId>({
  reorderSection,
  reorderSectionLabel,
  ...props
}: SortableManagedArraySectionProps<T>) {
  return (
    <ManagedArraySection
      {...props}
      reorder={{
        section: reorderSection,
        sectionLabel: reorderSectionLabel,
      }}
    />
  );
}
