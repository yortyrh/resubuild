'use client';

import type { ResumeLanguage } from '@resubuild/types';
import { EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { LanguageField } from '@/components/cv/language-field';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvLanguageApi } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

type LanguageItem = SectionItem<ResumeLanguage>;

export function LanguagesSection() {
  useSectionMount('languages');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <SortableManagedArraySection<LanguageItem>
      cvId={cvId}
      sectionKey="languages"
      reorderSection="languages"
      reorderSectionLabel="language"
      items={resume.languages ?? []}
      onItemsChange={(languages) => setResume((prev) => ({ ...prev, languages }))}
      entityLabel="Language"
      addLabel="Add language"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvLanguageApi}
      renderView={(item) => ({
        title: <span>{item.language || 'Language'}</span>,
        subtitle: item.fluency || undefined,
      })}
      renderForm={(item, onChange) => (
        <EntryComposer className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <div className="font-sans">
            <LanguageField
              label="Language"
              value={item.language}
              onChange={(language) => onChange({ ...item, language })}
            />
          </div>
          <InlineField
            label="Fluency"
            tone="subtitle"
            placeholder="Fluency, e.g. Native speaker"
            value={item.fluency}
            onChange={(fluency) => onChange({ ...item, fluency })}
          />
        </EntryComposer>
      )}
    />
  );
}
