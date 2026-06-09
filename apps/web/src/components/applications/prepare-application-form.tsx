'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApplicationIntakeOptions } from '@/components/applications/application-intake-options';
import { ApplicationPrepareActions } from '@/components/applications/application-prepare-actions';
import { ApplicationPrepareProgressBar } from '@/components/applications/application-prepare-progress-bar';
import { PrepareApplicationFilePicker } from '@/components/applications/prepare-application-file-picker';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApplication, type JobApplicationSummary, listCvs, prepareApplication } from '@/lib/api';
import { useAiAgentActive } from '@/lib/queries/ai-agent-queries';

type SourceMode = 'url' | 'text' | 'file';

const POLL_MS = 2500;
const SOURCE_MODES: ReadonlyArray<{ value: SourceMode; label: string }> = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
  { value: 'file', label: 'PDF or screenshot' },
];

export function PrepareApplicationForm() {
  const router = useRouter();
  const { data: activeStatus, isLoading: activeLoading } = useAiAgentActive();
  const { data: cvs = [] } = useQuery({ queryKey: ['cvs'], queryFn: listCvs });
  const [sourceMode, setSourceMode] = useState<SourceMode>('text');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pickMode, setPickMode] = useState<'auto' | 'manual'>('auto');
  const [sourceCvId, setSourceCvId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const application = await getApplication(id);
        setStatus(application.status);
        setProgress(application.progress ?? null);

        if (application.status === 'ready') {
          stopPolling();
          setSubmitting(false);
          router.push(`/dashboard/applications/${id}`);
          return;
        }

        if (application.status === 'failed') {
          stopPolling();
          setSubmitting(false);
          toast.error(application.errors?.join('\n') ?? 'Prepare failed');
        }
      } catch (error) {
        stopPolling();
        setSubmitting(false);
        setApplicationId(null);
        setProgress(null);
        setStatus(null);
        toast.error(error instanceof Error ? error.message : 'Prepare failed');
      }
    };

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, POLL_MS);
  };

  if (activeLoading) {
    return <p className="text-muted-foreground text-sm">Checking AI agent settings…</p>;
  }

  if (!activeStatus?.configured) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Configure an active AI agent account before preparing an application.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/ai-agent">Open AI agent settings</Link>
        </Button>
      </div>
    );
  }

  const inFlight = submitting || (applicationId != null && status !== 'failed');
  const showPrepareProgress = applicationId != null && (inFlight || status === 'failed');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setProgress(null);
    setStatus('queued');

    try {
      const result = await prepareApplication({
        url: sourceMode === 'url' ? url : undefined,
        text: sourceMode === 'text' ? text : undefined,
        message: message || undefined,
        sourceCvId: pickMode === 'manual' ? sourceCvId : undefined,
        file: sourceMode === 'file' ? (file ?? undefined) : undefined,
      });
      setApplicationId(result.applicationId);
      startPolling(result.applicationId);
    } catch (error) {
      setSubmitting(false);
      setStatus(null);
      toast.error(error instanceof Error ? error.message : 'Prepare failed');
    }
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <fieldset className="space-y-3" disabled={inFlight}>
        <legend className="font-medium">Job source</legend>

        <div
          data-testid="source-mode-group"
          className="surface-soft text-card-foreground inline-flex flex-wrap rounded-md p-1"
        >
          {SOURCE_MODES.map((mode) => {
            const isActive = sourceMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSourceMode(mode.value)}
                disabled={inFlight}
                data-testid={`source-mode-${mode.value}`}
                className={
                  isActive
                    ? 'bg-secondary text-secondary-foreground rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'
                    : 'hover:bg-accent hover:text-accent-foreground rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'
                }
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {sourceMode === 'url' ? (
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            disabled={inFlight}
            data-testid="source-input-url"
          />
        ) : null}

        {sourceMode === 'text' ? (
          <MarkdownEditor value={text} onChange={setText} placeholder="Paste job description…" />
        ) : null}

        {sourceMode === 'file' ? (
          <PrepareApplicationFilePicker value={file} onChange={setFile} disabled={inFlight} />
        ) : null}
      </fieldset>

      <div className={inFlight ? 'pointer-events-none opacity-60' : undefined}>
        <ApplicationIntakeOptions
          cvs={cvs}
          pickMode={pickMode}
          onPickModeChange={setPickMode}
          sourceCvId={sourceCvId}
          onSourceCvIdChange={setSourceCvId}
          message={message}
          onMessageChange={setMessage}
        />
      </div>

      <div className="space-y-3">
        <Button type="submit" disabled={inFlight}>
          {inFlight ? 'Preparing…' : 'Prepare application'}
        </Button>
        <div className="min-h-[2.75rem] space-y-3">
          {showPrepareProgress ? (
            <>
              <ApplicationPrepareProgressBar progress={progress} status={status ?? undefined} />
              {applicationId ? (
                <ApplicationPrepareActions
                  applicationId={applicationId}
                  application={
                    status ? { status: status as JobApplicationSummary['status'] } : undefined
                  }
                  showBackLink={false}
                  discardRedirectTo="/dashboard/applications/new"
                  onStatusChange={async () => {
                    const application = await getApplication(applicationId);
                    setStatus(application.status);
                    setProgress(application.progress ?? null);
                    if (application.status === 'queued' || application.status === 'running') {
                      startPolling(applicationId);
                      setSubmitting(true);
                      return;
                    }

                    stopPolling();
                    setSubmitting(false);

                    if (application.status === 'ready') {
                      router.push(`/dashboard/applications/${applicationId}`);
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
}
