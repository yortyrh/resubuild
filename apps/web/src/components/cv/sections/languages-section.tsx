'use client';

import type { ResumeLanguage } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
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
      emptyText="Languages you speak and how well."
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvLanguageApi}
      renderView={(item) => ({
        title: <span>{item.language || 'Language'}</span>,
        subtitle: item.fluency || undefined,
      })}
      renderForm={(item, onChange) => (
        <FormGroup title="Language">
          <FieldRow>
            <LanguageField
              label="Language"
              value={item.language}
              onChange={(language) => onChange({ ...item, language })}
            />
            <TextField
              label="Fluency"
              placeholder="Native, Fluent, B2…"
              value={item.fluency}
              onChange={(fluency) => onChange({ ...item, fluency })}
            />
          </FieldRow>
        </FormGroup>
      )}
    />
  );
}
