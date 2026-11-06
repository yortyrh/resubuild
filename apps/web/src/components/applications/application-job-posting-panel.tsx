import type { JobSourceType } from '@resubuild/types';
import type { ReactNode } from 'react';
import type { JobApplicationSummary } from '@/lib/api';

const SOURCE_TYPE_LABEL: Record<JobSourceType, string> = {
  url: 'Link',
  text: 'Pasted text',
  pdf: 'PDF',
  image: 'Screenshot',
};

const CHIP_CLASS =
  'bg-accent text-accent-foreground inline-flex rounded-md px-2 py-0.5 text-[0.8125rem]';

function hasText(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface-soft text-card-foreground space-y-3 p-4">
      <h3 className="wide text-[15px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[13px]">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function SourceSection({ application }: { application: JobApplicationSummary }) {
  const sourceType = application.jobSourceType;
  const sourceUrl = application.jobSourceUrl?.trim();
  const fileName = application.jobSourceFileName?.trim();
  const created = formatTimestamp(application.createdAt);
  const updated = formatTimestamp(application.updatedAt);

  return (
    <PanelSection title="Source">
      {sourceType ? <span className={CHIP_CLASS}>{SOURCE_TYPE_LABEL[sourceType]}</span> : null}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary block break-all text-sm underline-offset-4 hover:underline"
        >
          {sourceUrl}
        </a>
      ) : sourceType === 'url' ? (
        <p className="text-muted-foreground text-sm">Link not saved for this application</p>
      ) : null}
      {fileName ? <p className="break-all text-sm">{fileName}</p> : null}
      {created || updated ? (
        <dl className="space-y-2 text-sm tabular-nums">
          {created ? (
            <Field label="Created">
              <time dateTime={application.createdAt}>{created}</time>
            </Field>
          ) : null}
          {updated ? (
            <Field label="Updated">
              <time dateTime={application.updatedAt}>{updated}</time>
            </Field>
          ) : null}
        </dl>
      ) : null}
    </PanelSection>
  );
}

function DetailsSection({ application }: { application: JobApplicationSummary }) {
  const summary = application.jobSummary;
  const language = summary?.language?.trim();
  const requirements = summary?.requirements ?? [];
  const keywords = summary?.keywords ?? [];

  return (
    <PanelSection title="Details">
      <dl className="space-y-2 text-sm">
        {hasText(application.jobTitle) ? (
          <Field label="Position">{application.jobTitle}</Field>
        ) : null}
        {hasText(application.jobCompany) ? (
          <Field label="Company">{application.jobCompany}</Field>
        ) : null}
        {language ? <Field label="Language">{language}</Field> : null}
      </dl>
      {requirements.length > 0 ? (
        <div className="space-y-1.5">
          <h4 className="text-muted-foreground text-[13px]">Requirements</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {keywords.length > 0 ? (
        <div className="space-y-1.5">
          <h4 className="text-muted-foreground text-[13px]">Keywords</h4>
          <ul className="flex flex-wrap gap-1.5">
            {keywords.map((keyword, index) => (
              <li key={index} className={CHIP_CLASS}>
                {keyword}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PanelSection>
  );
}

function GenerationSection({ application }: { application: JobApplicationSummary }) {
  return (
    <PanelSection title="How it was generated">
      <dl className="space-y-2 text-sm">
        {hasText(application.sourceCvTitle) ? (
          <Field label="Base CV">
            {application.sourceCvTitle}
            {application.sourceCvFromSnapshot ? (
              <span className="text-muted-foreground"> (saved copy)</span>
            ) : null}
          </Field>
        ) : null}
        {hasText(application.selectionRationale) ? (
          <Field label="Why this CV">{application.selectionRationale}</Field>
        ) : null}
        {hasText(application.userMessage) ? (
          <Field label="Your instructions">{application.userMessage}</Field>
        ) : null}
      </dl>
    </PanelSection>
  );
}

/** Job posting tab: where the posting came from, what was extracted, and the text the AI used. */
export function ApplicationJobPostingPanel({
  application,
}: {
  application: JobApplicationSummary;
}) {
  const rawText = application.jobRawText;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SourceSection application={application} />
        <DetailsSection application={application} />
        <GenerationSection application={application} />
      </div>
      <PanelSection title="Job posting content">
        {hasText(rawText) ? (
          <p className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {rawText}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">No job posting text was saved.</p>
        )}
      </PanelSection>
    </div>
  );
}
