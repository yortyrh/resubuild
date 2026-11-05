'use client';

import { resolveProfileUrl } from '@resubuild/resume-template';
import type { ResumeProfile } from '@resubuild/types';
import { ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { SocialNetworkTitle } from '@/components/cv/contact-icons';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { ExternalLink } from '@/components/cv/external-link';
import { SocialNetworkCombobox } from '@/components/cv/social-network-combobox';
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
          <SocialNetworkTitle network={item.network}>
            {item.network || 'Network'}
            {item.username ? ` — ${item.username}` : ''}
          </SocialNetworkTitle>
        ),
        body: (() => {
          const href = resolveProfileUrl(item);
          if (!href) return null;
          const label = item.username?.trim() || href.replace(/^https?:\/\//, '');
          return (
            <p className="text-sm font-normal">
              <ExternalLink href={href}>{label}</ExternalLink>
            </p>
          );
        })(),
      })}
      renderForm={(item, onChange) => (
        <EntryComposer className="space-y-3">
          <div className="font-sans">
            <SocialNetworkCombobox
              value={item.network}
              onChange={(network) => onChange({ ...item, network })}
            />
          </div>
          <ComposerRow
            left={
              <InlineField
                label="Username"
                tone="title"
                value={item.username}
                onChange={(username) => onChange({ ...item, username })}
              />
            }
            right={
              <InlineField
                label="Profile URL"
                type="url"
                tone="meta"
                align="right"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
                className="w-64"
              />
            }
          />
        </EntryComposer>
      )}
    />
  );
}
