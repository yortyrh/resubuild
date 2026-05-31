'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  cancelApplication,
  deleteApplication,
  type JobApplicationSummary,
  retryApplication,
} from '@/lib/api';

export interface ApplicationPrepareActionsProps {
  applicationId: string;
  application?: Pick<JobApplicationSummary, 'status' | 'jobTitle'>;
  /** Called after cancel/retry so parent can refresh polling state. */
  onStatusChange?: () => void | Promise<void>;
  /** After discard delete, where to navigate (default: applications list). */
  discardRedirectTo?: string;
  showBackLink?: boolean;
}

export function ApplicationPrepareActions({
  applicationId,
  application,
  onStatusChange,
  discardRedirectTo = '/dashboard/applications',
  showBackLink = true,
}: ApplicationPrepareActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'cancel' | 'retry' | 'discard' | null>(null);

  const canCancel =
    application?.status === 'queued' || application?.status === 'running' || !application;
  const canRetry =
    application?.status === 'queued' ||
    application?.status === 'running' ||
    application?.status === 'failed';

  const onCancel = async () => {
    setBusy('cancel');
    try {
      await cancelApplication(applicationId);
      await onStatusChange?.();
      toast.message('Prepare stopped');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not stop prepare');
    } finally {
      setBusy(null);
    }
  };

  const onRetry = async () => {
    setBusy('retry');
    try {
      await retryApplication(applicationId);
      await onStatusChange?.();
      toast.success('Retrying…');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not retry');
    } finally {
      setBusy(null);
    }
  };

  const onDiscard = async () => {
    setBusy('discard');
    try {
      await deleteApplication(applicationId);
      toast.message('Application removed');
      router.push(discardRedirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove application');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry ? (
        <Button
          type="button"
          variant="default"
          disabled={busy != null}
          onClick={() => void onRetry()}
        >
          {busy === 'retry' ? 'Retrying…' : 'Retry'}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy != null}
          onClick={() => void onCancel()}
        >
          {busy === 'cancel' ? 'Stopping…' : 'Stop'}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={busy != null}
        onClick={() => void onDiscard()}
      >
        {busy === 'discard' ? 'Removing…' : 'Discard'}
      </Button>
      {showBackLink ? (
        <Button asChild variant="ghost" disabled={busy != null}>
          <Link href="/dashboard/applications">Back to applications</Link>
        </Button>
      ) : null}
    </div>
  );
}
