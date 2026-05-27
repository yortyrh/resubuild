'use client';

import type { ResumeSkill } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { getCvSkills } from '@/lib/api';
import { cvSkillApi } from '@/lib/cv-item-api';
import { createSectionRefetch, type SectionItem } from '@/lib/cv-section-refetch';

type SkillItem = SectionItem<ResumeSkill>;

export function SkillsSection() {
  useSectionMount('skills');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<SkillItem>
      cvId={cvId}
      items={resume.skills ?? []}
      onItemsChange={(skills) => setResume((prev) => ({ ...prev, skills }))}
      refetchItems={createSectionRefetch<SkillItem>(getCvSkills, cvId)}
      entityLabel="Skill"
      addLabel="Add skill"
      createEmpty={() => ({ keywords: [] })}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvSkillApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Skill'}</span>,
        subtitle: item.level || undefined,
        body: <TagsList values={item.keywords ?? []} />,
      })}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Level"
            value={item.level}
            onChange={(level) => onChange({ ...item, level })}
          />
          <TagsInput
            label="Keywords"
            description="Press Enter to add each keyword tag."
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </>
      )}
    />
  );
}
