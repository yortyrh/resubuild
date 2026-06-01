'use client';

import type { ResumeCertificate } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { validateRequiredDateOnCreate } from '@/components/cv/cv-section-helpers';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
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
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <IsoDateField
            label="Date"
            required={context?.mode === 'create'}
            value={item.date}
            error={context?.fieldErrors.date}
            onChange={(date) => onChange({ ...item, date })}
          />
          <TextField
            label="Issuer"
            value={item.issuer}
            onChange={(issuer) => onChange({ ...item, issuer })}
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
