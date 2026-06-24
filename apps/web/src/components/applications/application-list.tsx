'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/applications/application-data-table';
import {
  type ApplicationRow,
  type ApplicationRowActions,
  getApplicationColumns,
  toApplicationRow,
} from '@/components/applications/application-data-table-columns';
import { ApplicationListSkeleton } from '@/components/applications/application-list-skeleton';
import { ApplicationRowCard } from '@/components/applications/application-row-card';
import { ApplicationUpdateDialog } from '@/components/applications/application-update-dialog';
import { DeleteItemDialog } from '@/components/cv/cv-item-ui';
import { Button } from '@/components/ui/button';
import {
  deleteApplication,
  downloadApplicationLetterPdf,
  downloadCvPdf,
  type JobApplicationSummary,
  listApplications,
} from '@/lib/api';
import { triggerBrowserDownload } from '@/lib/download';

export function ApplicationList() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteRow, setDeleteRow] = useState<ApplicationRow | null>(null);
  const [updateRow, setUpdateRow] = useState<ApplicationRow | null>(null);
  const [exportingCvPdfFor, setExportingCvPdfFor] = useState<string | null>(null);
  const [exportingLetterPdfFor, setExportingLetterPdfFor] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
    refetchInterval: (query) => {
      const list = query.state.data;
      if (!list) return false;
      return list.some((app) => app.status === 'queued' || app.status === 'running') ? 2500 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      toast.success('Application deleted');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDeleteRow(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    },
  });

  const handleExportCvPdf = useCallback(
    async (row: ApplicationRow) => {
      const tailoredCvId = row.raw.tailoredCvId;
      if (!tailoredCvId || exportingCvPdfFor || exportingLetterPdfFor) {
        return;
      }

      setExportingCvPdfFor(row.id);
      try {
        const { blob, filename } = await downloadCvPdf(tailoredCvId);
        triggerBrowserDownload(blob, filename);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to export CV as PDF');
      } finally {
        setExportingCvPdfFor(null);
      }
    },
    [exportingCvPdfFor, exportingLetterPdfFor],
  );

  const handleExportLetterPdf = useCallback(
    async (row: ApplicationRow) => {
      if (exportingCvPdfFor || exportingLetterPdfFor) {
        return;
      }

      setExportingLetterPdfFor(row.id);
      try {
        const { blob, filename } = await downloadApplicationLetterPdf(row.id);
        triggerBrowserDownload(blob, filename);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to export cover letter as PDF');
      } finally {
        setExportingLetterPdfFor(null);
      }
    },
    [exportingCvPdfFor, exportingLetterPdfFor],
  );

  const handlePreviewCv = useCallback(
    (row: ApplicationRow) => {
      const tailoredCvId = row.raw.tailoredCvId;
      if (!tailoredCvId) {
        return;
      }
      router.push(`/dashboard/cv/${tailoredCvId}/preview?applicationId=${row.id}`);
    },
    [router],
  );

  const actions = useMemo<ApplicationRowActions>(
    () => ({
      onUpdate: setUpdateRow,
      onDelete: setDeleteRow,
      onExportCvPdf: handleExportCvPdf,
      onExportLetterPdf: handleExportLetterPdf,
      onPreviewCv: handlePreviewCv,
      exportingCvPdfFor,
      exportingLetterPdfFor,
    }),
    [
      handleExportCvPdf,
      handleExportLetterPdf,
      handlePreviewCv,
      exportingCvPdfFor,
      exportingLetterPdfFor,
    ],
  );

  const rows = useMemo(() => data.map(toApplicationRow), [data]);
  const columns = useMemo(() => getApplicationColumns(actions), [actions]);
  const renderCard = useCallback(
    (row: ApplicationRow) => <ApplicationRowCard row={row} actions={actions} />,
    [actions],
  );
  const getRowKey = useCallback((row: ApplicationRow) => row.id, []);

  const confirmDelete = async () => {
    if (!deleteRow) {
      return;
    }

    await deleteMutation.mutateAsync(deleteRow.id);
  };

  if (isLoading) {
    return <ApplicationListSkeleton />;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : 'Failed to load applications'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Button asChild aria-label="Prepare application">
          <Link href="/dashboard/applications/new">
            <FilePlus2 className="size-4 shrink-0 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Prepare application</span>
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        caption="Applications"
        renderCard={renderCard}
        getRowKey={getRowKey}
      />

      <DeleteItemDialog
        open={deleteRow !== null}
        title="Delete application?"
        description={
          deleteRow
            ? formatDeleteDescription(deleteRow.raw)
            : 'This application will be permanently removed. This cannot be undone.'
        }
        confirming={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteMutation.isPending) {
            setDeleteRow(null);
          }
        }}
      />

      {updateRow ? (
        <ApplicationUpdateDialog
          application={updateRow.raw}
          open
          onOpenChange={(open) => {
            if (!open) {
              setUpdateRow(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function formatDeleteDescription(application: JobApplicationSummary): string {
  const parts = [application.jobTitle ?? 'Untitled application'];
  if (application.jobCompany) {
    parts.push(application.jobCompany);
  }
  return `"${parts.join(' · ')}" will be permanently removed. This cannot be undone.`;
}
