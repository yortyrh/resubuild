'use client';

import type { Resume, ResumeProfile } from '@resubuild/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, FileDown, PenLine, Printer, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApplicationPrepareActions } from '@/components/applications/application-prepare-actions';
import { ApplicationPrepareProgressBar } from '@/components/applications/application-prepare-progress-bar';
import { ApplicationUpdateDialog } from '@/components/applications/application-update-dialog';
import { ApplicationWorkspaceBreadcrumb } from '@/components/applications/application-workspace-breadcrumb';
import { BasicsSectionView } from '@/components/cv/basics-section-view';
import { MarkdownEditor, type MarkdownEditorHandle } from '@/components/cv/markdown-editor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const WORKSPACE_TAB_STORAGE_KEY = 'application-workspace:lastTab';
const WORKSPACE_TAB_IDS = ['summary', 'tailored-cv', 'cover-letter'] as const;
type WorkspaceTabId = (typeof WORKSPACE_TAB_IDS)[number];
const DEFAULT_WORKSPACE_TAB: WorkspaceTabId = 'summary';

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

  useEffect(() => {
    if (updateDraft?.status !== 'ready' || !updateDraftId) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['applications'] });
    router.replace(`/dashboard/applications/${updateDraftId}`);
  }, [updateDraft?.status, updateDraftId, queryClient, router]);
  const [letterDraft, setLetterDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(() => readStoredWorkspaceTab());
  const markdownEditorRef = useRef<MarkdownEditorHandle>(null);

  const handleTabChange = (value: string) => {
    if ((WORKSPACE_TAB_IDS as readonly string[]).includes(value)) {
      const next = value as WorkspaceTabId;
      setActiveTab(next);
      writeStoredWorkspaceTab(next);
    }
  };

  useEffect(() => {
    if (data?.coverLetter != null) {
      setLetterDraft(data.coverLetter);
      markdownEditorRef.current?.setMarkdown(data.coverLetter);
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

      <div className="space-y-2 px-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ApplicationWorkspaceBreadcrumb
            jobTitle={data.jobTitle}
            jobCompany={data.jobCompany}
            hideTrail
            className="min-w-0 flex-1"
          />
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
        <h1 className="text-2xl font-semibold tracking-tight">
          {[data.jobTitle, data.jobCompany].filter(Boolean).join(' · ') || 'Application'}
        </h1>
      </div>

      <ApplicationUpdateDialog application={data} open={updateOpen} onOpenChange={setUpdateOpen} />

      <div className="surface-soft text-card-foreground p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="summary">Job summary</TabsTrigger>
              <TabsTrigger value="tailored-cv">Tailored CV</TabsTrigger>
              <TabsTrigger value="cover-letter">Cover letter</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
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
                </>
              ) : null}
              {activeTab === 'cover-letter' ? (
                <>
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
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Position</dt>
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
          </TabsContent>

          <TabsContent value="tailored-cv" className="space-y-3">
            {data.tailoredCvId ? (
              <TailoredCvPanel applicationId={data.id} tailoredCvId={data.tailoredCvId} />
            ) : (
              <p className="text-muted-foreground text-sm">No tailored CV is attached.</p>
            )}
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-3">
            <MarkdownEditor
              ref={markdownEditorRef}
              value={letterDraft}
              onChange={setLetterDraft}
              variant="block"
              placeholder="Cover letter markdown…"
              className="cover-letter-editor"
            />
            <Button size="sm" disabled={saving} onClick={() => void saveLetter()}>
              {saving ? 'Saving…' : 'Save letter'}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TailoredCvPanel({
  applicationId: _applicationId,
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

  return (
    <div className="space-y-3">
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
