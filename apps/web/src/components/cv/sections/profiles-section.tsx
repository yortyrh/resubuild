'use client';

import { resolveProfileUrl } from '@resubuild/resume-template';
import type { ResumeProfile } from '@resubuild/types';
import { SocialNetworkTitle } from '@/components/cv/contact-icons';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { ExternalLink } from '@/components/cv/external-link';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
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
  const { cvId } = useCvEditor();

  return (
    <SortableManagedArraySection<ProfileItem>
      cvId={cvId}
      sectionKey="profiles"
      reorderSection="profiles"
      reorderSectionLabel="social profile"
      entityLabel="Profile"
      addLabel="Add social profile"
      emptyText="LinkedIn, GitHub and other public profiles."
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={profileApi}
      renderView={(item) => ({
        title: (
          <SocialNetworkTitle network={item.network}>
            {item.network || 'Network'}
            {item.username ? (
              <span className="text-muted-foreground font-normal"> {item.username}</span>
            ) : null}
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
        <FormGroup title="Profile">
          <FieldRow>
            <SocialNetworkCombobox
              value={item.network}
              onChange={(network) => onChange({ ...item, network })}
            />
            <TextField
              label="Username"
              value={item.username}
              onChange={(username) => onChange({ ...item, username })}
            />
          </FieldRow>
          <TextField
            label="URL"
            type="url"
            placeholder="https://"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
        </FormGroup>
      )}
    />
  );
}
