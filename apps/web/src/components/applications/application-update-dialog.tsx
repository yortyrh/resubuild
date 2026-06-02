'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type JobApplicationSummary, updateApplication } from '@/lib/api';

export interface ApplicationUpdateDialogProps {
  application: JobApplicationSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBaseCvLabel(application: JobApplicationSummary): string {
  const title = application.sourceCvTitle?.trim() || 'Saved base CV';
  if (application.sourceCvFromSnapshot) {
    return `${title} (saved copy — original CV was deleted)`;
  }

  return title;
}

export function ApplicationUpdateDialog({
  application,
  open,
  onOpenChange,
}: ApplicationUpdateDialogProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage(application.userMessage ?? '');
  }, [open, application.userMessage]);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await updateApplication(application.id, {
        message: message || undefined,
      });
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ['application', application.id] });
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Update started — your current application stays visible until it finishes.');
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
            Regenerate the tailored CV and cover letter using the saved job posting, the same base
            CV as before, and your updated instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Base CV</p>
            <p className="text-muted-foreground text-sm">{formatBaseCvLabel(application)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-application-message">Optional instruction</Label>
            <Textarea
              id="update-application-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Emphasize React experience…"
            />
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col sm:space-x-0">
          <Button type="button" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? 'Starting…' : 'Update application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
