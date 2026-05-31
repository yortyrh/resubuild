'use client';

import type { Resume, ResumeProfile } from '@resumind/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, FileDown, PenLine, Printer, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApplicationPrepareActions } from '@/components/applications/application-prepare-actions';
import { ApplicationPrepareProgressBar } from '@/components/applications/application-prepare-progress-bar';
import { ApplicationUpdateDialog } from '@/components/applications/application-update-dialog';
import { ApplicationWorkspaceBreadcrumb } from '@/components/applications/application-workspace-breadcrumb';
import { BasicsSectionView } from '@/components/cv/basics-section-view';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Button } from '@/components/ui/button';
import {
  downloadApplicationLetterPdf,
  getApplication,
  getApplicationLetterHtml,
  getCv,
  type JobApplicationSummary,
  updateApplicationLetter,
} from '@/lib/api';
import {
  formatCoverLetterHtmlForClipboard,
  formatCoverLetterPlainText,
  resolveCoverLetterEmailSubject,
} from '@/lib/cover-letter-clipboard';
import { printHtmlDocument } from '@/lib/print-html-document';
import { useCvSection } from '@/lib/queries/cv-queries';
import { cvKeys } from '@/lib/queries/keys';

const POLL_MS = 2500;

export function ApplicationWorkspace({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'queued' || status === 'running' ? POLL_MS : false;
    },
  });
  const [letterDraft, setLetterDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  useEffect(() => {
    if (data?.coverLetter != null) {
      setLetterDraft(data.coverLetter);
    }
  }, [data?.coverLetter]);

  const copyRichText = async () => {
    if (!data) return;

    const emailSubject = resolveCoverLetterEmailSubject(
      data.coverLetterEmailSubject,
      data.jobTitle,
      data.jobCompany,
    );
    const plain = formatCoverLetterPlainText(emailSubject, letterDraft);

    try {
      const html = await getApplicationLetterHtml(id);
      const htmlForClipboard = formatCoverLetterHtmlForClipboard(emailSubject, html);
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlForClipboard], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      toast.success('Cover letter copied');
    } catch {
      await navigator.clipboard.writeText(plain);
      toast.success('Cover letter copied as plain text');
    }
  };

  const saveLetter = async () => {
    setSaving(true);
    try {
      await updateApplicationLetter(id, letterDraft);
      await queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('Letter saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const { blob, filename } = await downloadApplicationLetterPdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF download failed');
    }
  };

  const printLetter = async () => {
    if (!data) return;

    setPrinting(true);
    try {
      if (letterDraft !== data.coverLetter) {
        await updateApplicationLetter(id, letterDraft);
        await queryClient.invalidateQueries({ queryKey: ['application', id] });
      }

      const html = await getApplicationLetterHtml(id);
      printHtmlDocument(html);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  if (!data) {
    return <p className="text-muted-foreground text-sm">Loading application…</p>;
  }

  if (data.status === 'failed') {
    return (
      <div className="space-y-4">
        <ApplicationWorkspaceBreadcrumb pageLabel="Application failed" />
        <p className="text-destructive text-sm">{data.errors?.join('\n') ?? 'Unknown error'}</p>
        <ApplicationPrepareActions
          applicationId={id}
          application={data}
          onStatusChange={() => refetch()}
        />
      </div>
    );
  }

  if (data.status !== 'ready') {
    return (
      <PreparingState application={data} applicationId={id} onRefresh={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <div className="min-w-0 flex-1 align-middle">
          <h1 className="sr-only">
            {[data.jobTitle ?? 'Application', data.jobCompany].filter(Boolean).join(' · ')}
          </h1>
          <ApplicationWorkspaceBreadcrumb jobTitle={data.jobTitle} jobCompany={data.jobCompany} />
        </div>
        <Button variant="outline" onClick={() => setUpdateOpen(true)}>
          <Sparkles className="h-4 w-4" />
          Update
        </Button>
      </div>

      <ApplicationUpdateDialog application={data} open={updateOpen} onOpenChange={setUpdateOpen} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-soft text-card-foreground space-y-3 p-4">
          <h2 className="font-medium">Job summary</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Title</dt>
              <dd>{data.jobTitle}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd>{data.jobCompany}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Why this CV</dt>
              <dd>{data.selectionRationale}</dd>
            </div>
          </dl>

          <h2 className="pt-2 font-medium">Tailored CV</h2>
          {data.tailoredCvId ? (
            <TailoredCvPanel applicationId={data.id} tailoredCvId={data.tailoredCvId} />
          ) : null}
        </section>

        <section className="surface-soft text-card-foreground space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Cover letter</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void copyRichText()}>
                <Copy className="h-4 w-4" />
                Copy letter
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={printing}
                onClick={() => void printLetter()}
              >
                <Printer className="h-4 w-4" />
                {printing ? 'Printing…' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void downloadPdf()}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <MarkdownEditor
            value={letterDraft}
            onChange={setLetterDraft}
            variant="block"
            placeholder="Cover letter markdown…"
            className="cover-letter-editor"
          />
          <Button size="sm" disabled={saving} onClick={() => void saveLetter()}>
            {saving ? 'Saving…' : 'Save letter'}
          </Button>
        </section>
      </div>
    </div>
  );
}

function TailoredCvPanel({
  applicationId,
  tailoredCvId,
}: {
  applicationId: string;
  tailoredCvId: string;
}) {
  const { data: cv, isLoading: isCvLoading } = useQuery({
    queryKey: cvKeys.detail(tailoredCvId),
    queryFn: () => getCv(tailoredCvId),
    enabled: Boolean(tailoredCvId),
    refetchOnMount: 'always',
  });
  const { data: profiles = [], isLoading: isProfilesLoading } = useCvSection<ResumeProfile>(
    tailoredCvId,
    'profiles',
  );
  const basics = (cv?.data as Resume | undefined)?.basics;
  const isLoading = isCvLoading || isProfilesLoading;

  const editHref = `/dashboard/cv/${tailoredCvId}?applicationId=${applicationId}`;
  const previewHref = `/dashboard/cv/${tailoredCvId}/preview?applicationId=${applicationId}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={editHref}>
            <PenLine className="h-4 w-4" />
            Edit CV
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={previewHref} aria-label="Preview">
            <Eye className="h-4 w-4" />
            Preview
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading CV basics…</p>
      ) : basics ? (
        <BasicsSectionView basics={basics} profiles={profiles} showImage={false} />
      ) : null}
    </div>
  );
}

function PreparingState({
  application,
  applicationId,
  onRefresh,
}: {
  application: JobApplicationSummary;
  applicationId: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <ApplicationWorkspaceBreadcrumb pageLabel="Preparing application…" />
      <ApplicationPrepareProgressBar
        progress={application.progress}
        status={application.status}
        isUpdate={Boolean(application.jobTitle)}
      />
      <p className="text-muted-foreground text-sm">
        Taking longer than expected? Stop the run, retry, or discard this application.
      </p>
      <ApplicationPrepareActions
        applicationId={applicationId}
        application={application}
        onStatusChange={onRefresh}
      />
    </div>
  );
}
