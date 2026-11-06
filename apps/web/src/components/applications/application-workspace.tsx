'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, FileDown, Loader2, PenLine, Printer, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CvPreviewDocumentSkeleton } from '@/app/dashboard/cv/[id]/preview/cv-preview-skeleton';
import { ApplicationJobPostingPanel } from '@/components/applications/application-job-posting-panel';
import { ApplicationLetterEditDialog } from '@/components/applications/application-letter-edit-dialog';
import { ApplicationPrepareActions } from '@/components/applications/application-prepare-actions';
import { ApplicationPrepareProgressBar } from '@/components/applications/application-prepare-progress-bar';
import { ApplicationUpdateDialog } from '@/components/applications/application-update-dialog';
import { ApplicationWorkspaceBreadcrumb } from '@/components/applications/application-workspace-breadcrumb';
import { ApplicationWorkspaceSkeleton } from '@/components/applications/application-workspace-skeleton';
import { CvPreviewIframe } from '@/components/cv/cv-preview-iframe';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useCvPreviewHtml } from '@/components/cv/use-cv-preview-html';
import { useDashboardBreadcrumb } from '@/components/dashboard/dashboard-breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  downloadApplicationLetterPdf,
  downloadCvPdf,
  getApplication,
  getApplicationLetterHtml,
  getCv,
  type JobApplicationSummary,
} from '@/lib/api';
import {
  formatCoverLetterHtmlForClipboard,
  formatCoverLetterPlainText,
  resolveCoverLetterEmailSubject,
} from '@/lib/cover-letter-clipboard';
import { triggerBrowserDownload } from '@/lib/download';
import { formatJobPostingPlainText } from '@/lib/job-posting-clipboard';
import { printHtmlDocument } from '@/lib/print-html-document';
import { applicationLetterHtmlKey, cvKeys } from '@/lib/queries/keys';

const POLL_MS = 2500;

const WORKSPACE_TAB_STORAGE_KEY = 'application-workspace:lastTab';
const WORKSPACE_TAB_IDS = ['summary', 'tailored-cv', 'cover-letter'] as const;
type WorkspaceTabId = (typeof WORKSPACE_TAB_IDS)[number];
const DEFAULT_WORKSPACE_TAB: WorkspaceTabId = 'summary';
const DEFAULT_CV_TEMPLATE_ID = 'classic';

function readStoredWorkspaceTab(): WorkspaceTabId {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_TAB;
  try {
    const stored = window.sessionStorage.getItem(WORKSPACE_TAB_STORAGE_KEY);
    if (stored && (WORKSPACE_TAB_IDS as readonly string[]).includes(stored)) {
      return stored as WorkspaceTabId;
    }
  } catch {
    // sessionStorage can throw in private browsing modes; fall through to default.
  }
  return DEFAULT_WORKSPACE_TAB;
}

function writeStoredWorkspaceTab(value: WorkspaceTabId): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(WORKSPACE_TAB_STORAGE_KEY, value);
  } catch {
    // Ignore write failures (e.g. quota / disabled storage); the UI still works in-memory.
  }
}

export function ApplicationWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    refetchInterval: (query) => {
      const app = query.state.data;
      if (!app) return false;
      if (app.updateInProgress) return POLL_MS;
      const status = app.status;
      return status === 'queued' || status === 'running' ? POLL_MS : false;
    },
  });

  const updateDraftId = data?.updateDraftId;
  const { data: updateDraft } = useQuery({
    queryKey: ['application', updateDraftId],
    queryFn: () => getApplication(updateDraftId!),
    enabled: Boolean(updateDraftId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'queued' || status === 'running' ? POLL_MS : false;
    },
  });

  const tailoredCvId = data?.tailoredCvId ?? null;
  const { data: tailoredCv } = useQuery({
    queryKey: cvKeys.detail(tailoredCvId ?? ''),
    queryFn: () => getCv(tailoredCvId!),
    enabled: Boolean(tailoredCvId) && data?.status === 'ready',
    refetchOnMount: 'always',
  });
  const tailoredCvTemplateId = tailoredCv
    ? (tailoredCv.templateId ?? DEFAULT_CV_TEMPLATE_ID)
    : null;

  const { setBreadcrumb, reset: resetBreadcrumb } = useDashboardBreadcrumb();

  useEffect(() => {
    if (updateDraft?.status !== 'ready' || !updateDraftId) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['applications'] });
    router.replace(`/dashboard/applications/${updateDraftId}`);
  }, [updateDraft?.status, updateDraftId, queryClient, router]);

  useEffect(() => {
    if (!data) {
      resetBreadcrumb();
      return;
    }
    setBreadcrumb({ variant: 'application', application: data });
    return () => resetBreadcrumb();
  }, [data, setBreadcrumb, resetBreadcrumb]);
  const [printing, setPrinting] = useState(false);
  const [downloadingCvPdf, setDownloadingCvPdf] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [letterEditOpen, setLetterEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(() => readStoredWorkspaceTab());

  const handleTabChange = (value: string) => {
    if ((WORKSPACE_TAB_IDS as readonly string[]).includes(value)) {
      const next = value as WorkspaceTabId;
      setActiveTab(next);
      writeStoredWorkspaceTab(next);
    }
  };

  const copyRichText = async () => {
    if (!data) return;

    const emailSubject = resolveCoverLetterEmailSubject(
      data.coverLetterEmailSubject,
      data.jobTitle,
      data.jobCompany,
    );
    const letter = data.coverLetter ?? '';
    const plain = formatCoverLetterPlainText(emailSubject, letter);

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

  const copyJobPosting = async () => {
    if (!data) return;
    const text = formatJobPostingPlainText(data);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Job posting copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const downloadTailoredCvPdf = async () => {
    if (!tailoredCvId || !tailoredCvTemplateId) return;
    setDownloadingCvPdf(true);
    try {
      const { blob, filename } = await downloadCvPdf(tailoredCvId, tailoredCvTemplateId);
      triggerBrowserDownload(blob, filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF download failed');
    } finally {
      setDownloadingCvPdf(false);
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
      const html = await getApplicationLetterHtml(id);
      printHtmlDocument(html);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  if (!data) {
    return <ApplicationWorkspaceSkeleton />;
  }

  if (data.status === 'failed') {
    return (
      <div className="space-y-4">
        <ApplicationWorkspaceBreadcrumb pageLabel="Application failed" />
        <p className="text-destructive text-sm">{data.errors?.join('\n') ?? 'Unknown error'}</p>
        <ApplicationPrepareActions
          applicationId={id}
          application={data}
          onStatusChange={() => void refetch()}
        />
      </div>
    );
  }

  if (data.status !== 'ready') {
    return (
      <PreparingState application={data} applicationId={id} onRefresh={() => void refetch()} />
    );
  }

  const updateFailed = updateDraft?.status === 'failed';

  return (
    <div className="space-y-6">
      {data.updateInProgress ? (
        <div className="border-border space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Update in progress</p>
          <ApplicationPrepareProgressBar
            progress={updateDraft?.progress}
            status={updateDraft?.status ?? 'running'}
            isUpdate
          />
          {updateFailed ? (
            <p className="text-destructive text-sm">
              {updateDraft.errors?.join('\n') ??
                'Update failed. Your previous application is unchanged.'}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Your current application stays available until the update finishes.
            </p>
          )}
        </div>
      ) : null}

      <div className="no-print px-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[2rem] sm:text-[2.5rem]">
              {data.jobCompany?.trim() || 'Application'}
            </h1>
            {data.jobTitle?.trim() ? (
              <p className="text-muted-foreground truncate text-sm sm:text-base">
                {data.jobTitle.trim()}
              </p>
            ) : null}
          </div>
          <Button
            variant="outline"
            disabled={data.updateInProgress}
            onClick={() => setUpdateOpen(true)}
            aria-label="Update application"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Update</span>
          </Button>
        </div>
      </div>

      <ApplicationUpdateDialog application={data} open={updateOpen} onOpenChange={setUpdateOpen} />

      <ApplicationLetterEditDialog
        applicationId={id}
        open={letterEditOpen}
        onOpenChange={setLetterEditOpen}
        initialValue={data.coverLetter ?? ''}
      />

      <div className="surface-soft text-card-foreground p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="summary">Job posting</TabsTrigger>
              <TabsTrigger value="tailored-cv">Tailored CV</TabsTrigger>
              <TabsTrigger value="cover-letter">Cover letter</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'summary' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!formatJobPostingPlainText(data)}
                  onClick={() => void copyJobPosting()}
                >
                  <Copy className="h-4 w-4" />
                  Copy posting
                </Button>
              ) : null}
              {activeTab === 'tailored-cv' && data.tailoredCvId ? (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/cv/${data.tailoredCvId}?applicationId=${data.id}`}>
                      <PenLine className="h-4 w-4" />
                      Edit CV
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/cv/${data.tailoredCvId}/preview?applicationId=${data.id}`}
                      aria-label="Preview"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!tailoredCvTemplateId || downloadingCvPdf}
                    onClick={() => void downloadTailoredCvPdf()}
                    aria-label="Download CV PDF"
                  >
                    {downloadingCvPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                </>
              ) : null}
              {activeTab === 'cover-letter' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.updateInProgress}
                    onClick={() => setLetterEditOpen(true)}
                  >
                    <PenLine className="h-4 w-4" />
                    Edit
                  </Button>
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
                </>
              ) : null}
            </div>
          </div>

          <TabsContent value="summary" className="space-y-3">
            <ApplicationJobPostingPanel application={data} />
          </TabsContent>

          <TabsContent value="tailored-cv" className="space-y-3">
            {data.tailoredCvId ? (
              <TailoredCvPanel tailoredCvId={data.tailoredCvId} templateId={tailoredCvTemplateId} />
            ) : (
              <p className="text-muted-foreground text-sm">No tailored CV is attached.</p>
            )}
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-3">
            <CoverLetterPanel application={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TailoredCvPanel({
  tailoredCvId,
  templateId,
}: {
  tailoredCvId: string;
  /** Null until the tailored CV has loaded. */
  templateId: string | null;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { html, error } = useCvPreviewHtml(tailoredCvId, templateId);

  if (html) {
    return <CvPreviewIframe html={html} frameRef={frameRef} title="Resume preview" />;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  return <CvPreviewDocumentSkeleton />;
}

function CoverLetterPanel({ application }: { application: JobApplicationSummary }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { data: letterHtml, isError } = useQuery({
    queryKey: applicationLetterHtmlKey(application.id),
    queryFn: () => getApplicationLetterHtml(application.id),
  });
  const subject = resolveCoverLetterEmailSubject(
    application.coverLetterEmailSubject,
    application.jobTitle,
    application.jobCompany,
  );

  const copySubject = async () => {
    try {
      await navigator.clipboard.writeText(subject);
      toast.success('Subject copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="surface-soft text-card-foreground flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground text-[13px]">Email subject</p>
          <p className="break-words text-sm font-medium">{subject}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void copySubject()}>
          <Copy className="h-4 w-4" />
          Copy subject
        </Button>
      </div>
      {letterHtml ? (
        <CvPreviewIframe html={letterHtml} frameRef={frameRef} title="Cover letter preview" />
      ) : isError ? (
        <MarkdownView value={application.coverLetter} variant="block" />
      ) : (
        <CvPreviewDocumentSkeleton />
      )}
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
