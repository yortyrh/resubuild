'use client';

import type { ResumeProfile } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { ExternalLink } from '@/components/cv/external-link';
import { TextField } from '@/components/cv/form-fields';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { createCvProfile, deleteCvProfile, updateCvProfile } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

type ProfileItem = SectionItem<ResumeProfile>;

const profileApi = {
  create: createCvProfile,
  update: updateCvProfile,
  delete: deleteCvProfile,
};

export function ProfilesSection() {
  useSectionMount('profiles');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <SortableManagedArraySection<ProfileItem>
      cvId={cvId}
      sectionKey="profiles"
      reorderSection="profiles"
      reorderSectionLabel="social profile"
      items={resume.basics?.profiles ?? []}
      onItemsChange={(profiles) =>
        setResume((prev) => ({ ...prev, basics: { ...prev.basics, profiles } }))
      }
      entityLabel="Profile"
      addLabel="Add social profile"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={profileApi}
      renderView={(item) => ({
        title: (
          <span>
            {item.network || 'Network'}
            {item.username ? ` — ${item.username}` : ''}
          </span>
        ),
        body: item.url ? (
          <p className="text-sm font-normal">
            <ExternalLink href={item.url} />
          </p>
        ) : null,
      })}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Network"
            value={item.network}
            onChange={(network) => onChange({ ...item, network })}
          />
          <TextField
            label="Username"
            value={item.username}
            onChange={(username) => onChange({ ...item, username })}
          />
          <TextField
            label="URL"
            type="url"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
        </>
      )}
    />
  );
}
