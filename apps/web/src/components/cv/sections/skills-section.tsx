'use client';

import type { ResumeSkill } from '@resubuild/types';
import { ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
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
      createEmpty={() => ({ keywords: [] })}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvSkillApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Skill'}</span>,
        subtitle: item.level || undefined,
        body: <TagsList values={item.keywords ?? []} />,
      })}
      renderForm={(item, onChange) => (
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Skill group"
                tone="title"
                placeholder="Skill group, e.g. Backend"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
            }
            right={
              <InlineField
                label="Level"
                tone="meta"
                align="right"
                placeholder="Level, e.g. Advanced"
                value={item.level}
                onChange={(level) => onChange({ ...item, level })}
                className="w-48"
              />
            }
          />
          <TagsInput
            variant="inline"
            label="Keywords"
            placeholder="Type a skill and press Enter or comma"
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </EntryComposer>
      )}
    />
  );
}
