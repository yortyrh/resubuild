'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApplicationIntakeOptions } from '@/components/applications/application-intake-options';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type JobApplicationSummary, listCvs, updateApplication } from '@/lib/api';

export interface ApplicationUpdateDialogProps {
  application: JobApplicationSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationUpdateDialog({
  application,
  open,
  onOpenChange,
}: ApplicationUpdateDialogProps) {
  const queryClient = useQueryClient();
  const { data: cvs = [] } = useQuery({ queryKey: ['cvs'], queryFn: listCvs });
  const [pickMode, setPickMode] = useState<'auto' | 'manual'>('auto');
  const [sourceCvId, setSourceCvId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setMessage(application.userMessage ?? '');
    if (application.intakeSourceCvId) {
      setPickMode('manual');
      setSourceCvId(application.intakeSourceCvId);
    } else {
      setPickMode('auto');
      setSourceCvId('');
    }
  }, [open, application.intakeSourceCvId, application.userMessage]);

  const onSubmit = async () => {
    if (pickMode === 'manual' && !sourceCvId) {
      toast.error('Select a base CV or choose AI pick');
      return;
    }

    setSubmitting(true);
    try {
      await updateApplication(application.id, {
        message: message || undefined,
        sourceCvId: pickMode === 'manual' ? sourceCvId : undefined,
      });
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ['application', application.id] });
      toast.success('Regenerating application…');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update application</DialogTitle>
          <DialogDescription>
            Regenerate the tailored CV and cover letter using the saved job posting and your updated
            instructions.
          </DialogDescription>
        </DialogHeader>

        <ApplicationIntakeOptions
          cvs={cvs}
          pickMode={pickMode}
          onPickModeChange={setPickMode}
          sourceCvId={sourceCvId}
          onSourceCvIdChange={setSourceCvId}
          message={message}
          onMessageChange={setMessage}
          messageId="update-application-message"
        />

        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col sm:space-x-0">
          <Button type="button" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? 'Starting…' : 'Update application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
