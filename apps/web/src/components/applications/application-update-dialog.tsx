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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  type JobApplicationSummary,
  updateApplication,
  updateApplicationMetadata,
} from '@/lib/api';

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
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPosition(application.jobTitle ?? '');
    setCompany(application.jobCompany ?? '');
    setMessage(application.userMessage ?? '');
  }, [open, application.jobTitle, application.jobCompany, application.userMessage]);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      // Persist any company/position edits so the new regen is associated with
      // the updated job posting metadata. The backend treats omitted fields as
      // "no change", so we only send fields the user actually edited.
      const trimmedPosition = position.trim();
      const trimmedCompany = company.trim();
      const metadataPatch: { jobTitle?: string; jobCompany?: string } = {};
      if (trimmedPosition !== (application.jobTitle ?? '')) {
        metadataPatch.jobTitle = trimmedPosition;
      }
      if (trimmedCompany !== (application.jobCompany ?? '')) {
        metadataPatch.jobCompany = trimmedCompany;
      }
      if (Object.keys(metadataPatch).length > 0) {
        await updateApplicationMetadata(application.id, metadataPatch);
      }

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
            Adjust the job posting details and regenerate the tailored CV and cover letter using the
            same base CV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Base CV</p>
            <p className="text-muted-foreground text-sm">{formatBaseCvLabel(application)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="update-application-position">Position</Label>
              <Input
                id="update-application-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Senior Software Engineer"
                maxLength={500}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-application-company">Company</Label>
              <Input
                id="update-application-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme"
                maxLength={500}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-application-message">Optional instruction</Label>
            <Textarea
              id="update-application-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Emphasize React experience…"
              disabled={submitting}
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
