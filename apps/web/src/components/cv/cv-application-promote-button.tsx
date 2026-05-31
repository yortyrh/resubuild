'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Library } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { type JobApplicationSummary, promoteApplicationClone } from '@/lib/api';
import { cvKeys } from '@/lib/queries/keys';
import { cn } from '@/lib/utils';

interface CvApplicationPromoteButtonProps {
  application: JobApplicationSummary;
  className?: string;
}

export function CvApplicationPromoteButton({
  application,
  className,
}: CvApplicationPromoteButtonProps) {
  const queryClient = useQueryClient();
  const [promoting, setPromoting] = useState(false);

  const handlePromote = async () => {
    setPromoting(true);
    try {
      await promoteApplicationClone(application.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: cvKeys.list() }),
      ]);
      toast.success('CV promoted to library');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promote failed');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      disabled={promoting}
      aria-label={promoting ? 'Promoting' : 'Promote'}
      onClick={() => void handlePromote()}
    >
      <Library className="size-4 shrink-0 lg:mr-1.5" aria-hidden />
      <span className="hidden lg:inline">{promoting ? 'Promoting…' : 'Promote'}</span>
    </Button>
  );
}
