'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type JobApplicationSummary, updateApplicationLetter } from '@/lib/api';

export interface ApplicationLetterEditDialogProps {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Latest server value; the dialog seeds its draft from this on every open. */
  initialValue: string;
}

export function ApplicationLetterEditDialog({
  applicationId,
  open,
  onOpenChange,
  initialValue,
}: ApplicationLetterEditDialogProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialValue);
  const [renderMarkdown, setRenderMarkdown] = useState(open);

  // Re-seed the draft whenever the dialog reopens with fresh server data.
  // Closing the dialog discards any unsaved edits — this is intentional, the
  // mutation is the only path that writes back to the cache.
  useEffect(() => {
    if (open) {
      setDraft(initialValue);
      setRenderMarkdown(true);
    } else {
      setRenderMarkdown(false);
    }
  }, [open, initialValue]);

  const mutation = useMutation({
    mutationFn: (coverLetter: string) => updateApplicationLetter(applicationId, coverLetter),
    onSuccess: (updated) => {
      // The PATCH returns the updated application summary, so we can write it
      // straight into the cache and skip an extra GET.
      queryClient.setQueryData(['application', applicationId], updated);
      toast.success('Cover letter saved');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    },
  });

  const handleSubmit = () => {
    mutation.mutate(draft);
  };

  const submitting = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[100dvh] max-w-[min(100vw-2rem,80rem)] flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit cover letter</DialogTitle>
          <DialogDescription>
            Adjust the cover letter markdown. Changes are saved when you press Save.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {renderMarkdown && initialValue.trim().length > 0 && (
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              variant="block"
              freeForm
              placeholder="Cover letter markdown…"
              className="cover-letter-editor"
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={handleSubmit}
            className="self-end"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export the summary type for convenience; consumers already import it from
// `@/lib/api`, but keeping a single import surface here simplifies downstream
// refactors if the mutation ever moves.
export type { JobApplicationSummary };
