'use client';

import type { ResumeCertificate } from '@resubuild/types';
import { ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineDateField } from '@/components/cv/composer/inline-date-field';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { validateRequiredDateOnCreate } from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvCertificateApi } from '@/lib/cv-item-api';
import { sortDatedSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type CertificateItem = SectionItem<ResumeCertificate>;

export function CertificatesSection() {
  useSectionMount('certificates');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<CertificateItem>
      cvId={cvId}
      sectionKey="certificates"
      items={resume.certificates ?? []}
      onItemsChange={(certificates) => setResume((prev) => ({ ...prev, certificates }))}
      entityLabel="Certificate"
      addLabel="Add certificate"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvCertificateApi}
      validateBeforeSave={validateRequiredDateOnCreate}
      sortItems={sortDatedSectionItems}
      renderView={(item) => {
        const certificateLabel = item.name || 'Certificate';
        return {
          title: <span>{linkedEntityLabel(certificateLabel, item.url) ?? certificateLabel}</span>,
          meta: item.date ? <div>{item.date}</div> : undefined,
          body: item.issuer ? <p className="text-sm font-normal">{item.issuer}</p> : null,
        };
      }}
      renderForm={(item, onChange, context) => (
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Certificate name"
                tone="title"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
            }
            right={
              <InlineDateField
                label="Date"
                required={context?.mode === 'create'}
                value={item.date}
                error={context?.fieldErrors.date}
                onChange={(date) => onChange({ ...item, date })}
              />
            }
          />
          <InlineField
            label="Issuer"
            tone="meta"
            placeholder="Issued by"
            value={item.issuer}
            onChange={(issuer) => onChange({ ...item, issuer })}
          />
          <InlineField
            label="Link"
            type="url"
            tone="meta"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
        </EntryComposer>
      )}
    />
  );
}
