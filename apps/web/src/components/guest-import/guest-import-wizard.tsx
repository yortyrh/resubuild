'use client';

import { renderResumeHtml } from '@resubuild/resume-template';
import type { Resume } from '@resubuild/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { CvPreviewIframe } from '@/components/cv/cv-preview-iframe';
import { TurnstileWidget } from '@/components/guest-import/turnstile-widget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type GuestImportStatus,
  getGuestImportJob,
  getGuestImportStatus,
  startGuestFileImport,
  startGuestUrlImport,
} from '@/lib/guest-import-api';
import { importProgressLabel } from '@/lib/import-job-progress';
import { savePendingGuestImport } from '@/lib/pending-guest-import';

const ACCEPT =
  '.pdf,.docx,.md,.markdown,.txt,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,image/png,image/jpeg,image/webp';
const POLL_MS = 2000;

type Phase =
  | { step: 'pick' }
  | { step: 'running'; jobId: string; guestToken: string; progress?: string }
  | { step: 'preview'; resume: Record<string, unknown> };

/**
 * Free "import your CV, then sign up" wizard: upload or link a CV, watch the
 * AI import run on the app-funded guest models, preview the result, then
 * create an account to keep it (the dashboard saves it after sign-up).
 */
export function GuestImportWizard({ pollMs = POLL_MS }: { pollMs?: number } = {}) {
  const router = useRouter();
  const fileInputId = useId();
  const urlInputId = useId();
  const [status, setStatus] = useState<GuestImportStatus | null>(null);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const [phase, setPhase] = useState<Phase>({ step: 'pick' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getGuestImportStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runningJobId = phase.step === 'running' ? phase.jobId : null;
  const runningGuestToken = phase.step === 'running' ? phase.guestToken : null;
  useEffect(() => {
    if (!runningJobId || !runningGuestToken) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void getGuestImportJob(runningJobId, runningGuestToken)
        .then((job) => {
          if (cancelled) return;
          if (job.status === 'succeeded' && job.previewData) {
            setPhase({ step: 'preview', resume: job.previewData });
          } else if (job.status === 'failed') {
            setError(job.errors?.join('\n') || 'The import failed. Try another file.');
            setPhase({ step: 'pick' });
            setChallengeKey((key) => key + 1);
          } else {
            setPhase((current) =>
              current.step === 'running' ? { ...current, progress: job.progress } : current,
            );
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Lost track of the import');
          setPhase({ step: 'pick' });
          setChallengeKey((key) => key + 1);
        });
    }, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runningJobId, runningGuestToken, pollMs]);

  const needsChallenge = Boolean(status?.turnstileSiteKey);
  const canStart =
    !submitting &&
    (!needsChallenge || Boolean(turnstileToken)) &&
    (mode === 'file' ? Boolean(file) : url.trim().length > 0);

  const start = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const token = turnstileToken ?? undefined;
      const result =
        mode === 'file' && file
          ? await startGuestFileImport(file, token)
          : await startGuestUrlImport(url.trim(), token);
      if (result.kind === 'json') {
        setPhase({ step: 'preview', resume: result.data });
      } else {
        setPhase({ step: 'running', jobId: result.jobId, guestToken: result.guestToken });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the import');
      // A Turnstile token is single-use.
      setChallengeKey((key) => key + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const keepAndContinue = useCallback(
    (href: '/register' | '/login') => {
      if (phase.step !== 'preview') return;
      savePendingGuestImport(phase.resume);
      router.push(href);
    },
    [phase, router],
  );

  if (!status) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!status.enabled && phase.step === 'pick') {
    return (
      <div className="space-y-4" role="status">
        <p>Free import is not available right now.</p>
        <p className="text-muted-foreground text-sm">
          Create a free account to import your CV with AI from your dashboard.
        </p>
        <Button asChild>
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    );
  }

  if (phase.step === 'preview') {
    return (
      <GuestImportPreview
        resume={phase.resume}
        onCreateAccount={() => keepAndContinue('/register')}
        onSignIn={() => keepAndContinue('/login')}
        onStartOver={() => {
          setPhase({ step: 'pick' });
          setChallengeKey((key) => key + 1);
        }}
      />
    );
  }

  if (phase.step === 'running') {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <p className="font-medium">Importing your CV…</p>
        <p className="text-muted-foreground text-sm">
          {phase.progress ? importProgressLabel(phase.progress) : 'Starting'} — this usually takes
          under a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist" aria-label="Import source">
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          variant={mode === 'file' ? 'default' : 'outline'}
          onClick={() => setMode('file')}
        >
          Upload a file
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          variant={mode === 'url' ? 'default' : 'outline'}
          onClick={() => setMode('url')}
        >
          From a web page
        </Button>
      </div>

      {mode === 'file' ? (
        <div className="space-y-2">
          <Label htmlFor={fileInputId}>Your CV (PDF, Word, Markdown or image)</Label>
          <Input
            key="file"
            id={fileInputId}
            type="file"
            accept={ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={urlInputId}>Page with your CV (portfolio, JSON Resume…)</Label>
          <Input
            key="url"
            id={urlInputId}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
      )}

      {status.turnstileSiteKey ? (
        <TurnstileWidget
          siteKey={status.turnstileSiteKey}
          onToken={setTurnstileToken}
          resetKey={challengeKey}
        />
      ) : null}

      {error ? (
        <p className="text-destructive whitespace-pre-line text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="button" disabled={!canStart} onClick={() => void start()}>
        {submitting ? 'Starting…' : 'Import my CV'}
      </Button>
      <p className="text-muted-foreground text-xs">
        Free, no account needed to try. Your CV is only kept if you create an account.
      </p>
    </div>
  );
}

function GuestImportPreview({
  resume,
  onCreateAccount,
  onSignIn,
  onStartOver,
}: {
  resume: Record<string, unknown>;
  onCreateAccount: () => void;
  onSignIn: () => void;
  onStartOver: () => void;
}) {
  const html = useMemo(() => renderResumeHtml(resume as Resume, 'classic'), [resume]);
  const name = (resume.basics as { name?: string } | undefined)?.name?.trim();

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{name ? `${name}, your CV is ready.` : 'Your CV is ready.'}</p>
        <p className="text-muted-foreground text-sm">
          Create a free account to save it, edit it and export it as PDF.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onCreateAccount}>
          Create account to keep it
        </Button>
        <Button type="button" variant="outline" onClick={onSignIn}>
          I have an account
        </Button>
        <Button type="button" variant="ghost" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      <div className="surface-soft text-card-foreground h-[70vh] overflow-hidden">
        <CvPreviewIframe html={html} title="Imported CV preview" className="h-full w-full" />
      </div>
    </div>
  );
}
