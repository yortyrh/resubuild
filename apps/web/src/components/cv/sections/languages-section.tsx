'use client';

import type { ResumeLanguage } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { LanguageField } from '@/components/cv/language-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvLanguageApi } from '@/lib/cv-item-api';

export function LanguagesSection() {
  useSectionMount('languages');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<ResumeLanguage>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.languages ?? []}
      onItemsChange={(languages) => setResume({ ...resume, languages })}
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
        <>
          <LanguageField
            label="Language"
            value={item.language}
            onChange={(language) => onChange({ ...item, language })}
          />
          <TextField
            label="Fluency"
            value={item.fluency}
            onChange={(fluency) => onChange({ ...item, fluency })}
          />
        </>
      )}
    />
  );
}
