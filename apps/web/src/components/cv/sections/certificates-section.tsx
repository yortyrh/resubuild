'use client';

import type { ResumeCertificate } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { type SectionItem } from '@/lib/cv-section-refetch';
import { cvCertificateApi } from '@/lib/cv-item-api';

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
      renderView={(item) => {
        const certificateLabel = item.name || 'Certificate';
        return {
          title: <span>{linkedEntityLabel(certificateLabel, item.url) ?? certificateLabel}</span>,
          meta: item.date ? <div>{item.date}</div> : undefined,
          body: item.issuer ? <p className="text-sm font-normal">{item.issuer}</p> : null,
        };
      }}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <IsoDateField
            label="Date"
            value={item.date}
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
