'use client';

import { FileJson, FileText, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ContactLineSegment } from '@/components/cv/contact-icons';
import { DeleteItemDialog } from '@/components/cv/cv-item-ui';
import { CvTemplateThumbnail } from '@/components/cv/cv-template-thumbnail';
import { ExternalLink } from '@/components/cv/external-link';
import { CvListSkeleton } from '@/components/dashboard/cv-list-skeleton';
import { NewCvDropdown } from '@/components/dashboard/new-cv-dropdown';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCvJson, downloadCvPdf } from '@/lib/api';
import { triggerBrowserDownload } from '@/lib/download';
import { useDeleteCv } from '@/lib/queries/cv-mutations';
import { useCvList } from '@/lib/queries/cv-queries';

interface CvCardBasics {
  name: string;
  label: string;
  email: string;
  phone: string;
  url: string;
}

function readCvBasics(data: unknown): CvCardBasics {
  const empty: CvCardBasics = { name: '', label: '', email: '', phone: '', url: '' };
  if (!data || typeof data !== 'object') {
    return empty;
  }

  const basics = (data as { basics?: unknown }).basics;
  if (!basics || typeof basics !== 'object') {
    return empty;
  }

  const readString = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
  };

  return {
    name: readString((basics as { name?: unknown }).name),
    label: readString((basics as { label?: unknown }).label),
    email: readString((basics as { email?: unknown }).email),
    phone: readString((basics as { phone?: unknown }).phone),
    url: readString((basics as { url?: unknown }).url),
  };
}

interface CvCardContactRowProps {
  email: string;
  phone: string;
  url: string;
}

function CvCardContactRow({ email, phone, url }: CvCardContactRowProps) {
  if (email) {
    return (
      <p className="text-muted-foreground text-sm">
        <ContactLineSegment type="email">{email}</ContactLineSegment>
      </p>
    );
  }

  if (url) {
    return (
      <p className="text-muted-foreground text-sm">
        <ContactLineSegment type="url">
          <ExternalLink href={url} showIcon={false}>
            {prettyUrl(url)}
          </ExternalLink>
        </ContactLineSegment>
      </p>
    );
  }

  if (phone) {
    return (
      <p className="text-muted-foreground text-sm">
        <ContactLineSegment type="phone">{phone}</ContactLineSegment>
      </p>
    );
  }

  return null;
}

function prettyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

export function CvList() {
  const { data: cvs = [], isLoading, error } = useCvList();
  const deleteCvMutation = useDeleteCv();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<{ cvId: string; kind: 'pdf' | 'json' } | null>(null);

  const pendingDelete = deleteId ? cvs.find((cv) => cv.id === deleteId) : undefined;

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await deleteCvMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Toast handled in mutation hook.
    }
  };

  const handleExport = async (cvId: string, kind: 'pdf' | 'json') => {
    if (exporting) {
      return;
    }

    setExporting({ cvId, kind });
    try {
      const { blob, filename } =
        kind === 'pdf' ? await downloadCvPdf(cvId) : await downloadCvJson(cvId);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : `${kind.toUpperCase()} export failed`;
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return <CvListSkeleton />;
  }

  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : 'Failed to load CVs'}
      </p>
    );
  }

  if (cvs.length === 0) {
    return (
      <article className="surface-soft text-card-foreground p-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">No CVs yet</div>
          <div className="text-muted-foreground mt-0 text-sm font-normal leading-snug">
            Create your first Resubuild CV.
          </div>
        </div>
        <div className="divider-soft mt-4 flex gap-2 border-t pt-4">
          <NewCvDropdown label="Create CV" />
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My CVs</h1>
          <p className="text-muted-foreground">
            Create and edit CVs that follow the JSON Resume schema.
          </p>
        </div>
        <NewCvDropdown />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cvs.map((cv) => {
          const basics = readCvBasics(cv.data);
          const displayTitle = basics.name || cv.title;
          const hasStructuredHeader = Boolean(basics.name || basics.label);
          const isExportingThis = exporting?.cvId === cv.id;
          const exportKind = isExportingThis ? exporting?.kind : undefined;

          return (
            <article key={cv.id} className="surface-soft text-card-foreground flex gap-4 p-4">
              <Link
                href={`/dashboard/cv/${cv.id}`}
                aria-label={`Edit ${displayTitle}`}
                className="focus-visible:ring-ring w-30 block shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2"
              >
                <CvTemplateThumbnail templateId={cv.templateId} label={`${displayTitle} preview`} />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/dashboard/cv/${cv.id}`}
                      className={
                        hasStructuredHeader ? 'block text-xl font-semibold' : 'block font-semibold'
                      }
                    >
                      {displayTitle}
                    </Link>
                    {hasStructuredHeader && basics.label ? (
                      <div className="text-muted-foreground text-sm font-normal">
                        {basics.label}
                      </div>
                    ) : null}
                    <CvCardContactRow email={basics.email} phone={basics.phone} url={basics.url} />
                    <div className="text-muted-foreground/80 text-xs font-normal">
                      Updated {new Date(cv.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="divider-soft mt-auto flex flex-nowrap items-start justify-start gap-2 border-t pt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/dashboard/cv/${cv.id}/preview`}
                      aria-label={`Preview ${displayTitle}`}
                    >
                      Preview
                    </Link>
                  </Button>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Open actions for ${displayTitle}`}
                        className="text-muted-foreground shrink-0"
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={Boolean(exporting)}
                        onClick={() => void handleExport(cv.id, 'pdf')}
                        className="flex items-center gap-2"
                      >
                        {exportKind === 'pdf' ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileText className="size-4" aria-hidden="true" />
                        )}
                        {exportKind === 'pdf' ? 'Exporting PDF…' : 'Export PDF'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={Boolean(exporting)}
                        onClick={() => void handleExport(cv.id, 'json')}
                        className="flex items-center gap-2"
                      >
                        {exportKind === 'json' ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileJson className="size-4" aria-hidden="true" />
                        )}
                        {exportKind === 'json' ? 'Exporting JSON…' : 'Export JSON Resume'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(cv.id)}
                        className="text-destructive focus:text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          );
        })}

        <DeleteItemDialog
          open={deleteId !== null}
          title="Delete CV?"
          description={
            pendingDelete
              ? `"${pendingDelete.title}" will be permanently removed. This cannot be undone.`
              : 'This CV will be permanently removed. This cannot be undone.'
          }
          confirming={deleteCvMutation.isPending}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!deleteCvMutation.isPending) {
              setDeleteId(null);
            }
          }}
        />
      </div>
    </div>
  );
}
