'use client';

import type { ResumeSkill } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvSkillApi } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

type SkillItem = SectionItem<ResumeSkill>;

export function SkillsSection() {
  useSectionMount('skills');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <SortableManagedArraySection<SkillItem>
      cvId={cvId}
      sectionKey="skills"
      reorderSection="skills"
      reorderSectionLabel="skill"
      items={resume.skills ?? []}
      onItemsChange={(skills) => setResume((prev) => ({ ...prev, skills }))}
      entityLabel="Skill"
      addLabel="Add skill"
      emptyText="Group related skills, e.g. Frontend with React, TypeScript and CSS."
      createEmpty={() => ({ keywords: [] })}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvSkillApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Skill'}</span>,
        subtitle: item.level || undefined,
        body: <TagsList values={item.keywords ?? []} />,
      })}
      renderForm={(item, onChange) => (
        <FormGroup title="Skill">
          <FieldRow>
            <TextField
              label="Name"
              placeholder="Backend development"
              value={item.name}
              onChange={(name) => onChange({ ...item, name })}
            />
            <TextField
              label="Level"
              placeholder="Expert"
              value={item.level}
              onChange={(level) => onChange({ ...item, level })}
            />
          </FieldRow>
          <TagsInput
            label="Keywords"
            description="Enter or a comma adds each keyword."
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </FormGroup>
      )}
    />
  );
}
