'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { resolveImportedResumeData } from '@/lib/import-cv-media';
import { clearPendingGuestImport, loadPendingGuestImport } from '@/lib/pending-guest-import';
import { useCreateCv } from '@/lib/queries/cv-mutations';

/**
 * After sign-up (or sign-in), saves the CV imported in the free wizard to the
 * account and opens it in the editor. Runs once per browser import.
 */
export function PendingGuestImportSaver() {
  const router = useRouter();
  const createCv = useCreateCv();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const pending = loadPendingGuestImport();
    if (!pending) return;
    started.current = true;
    // Clear first so a failure or a second tab never creates duplicates.
    clearPendingGuestImport();

    void (async () => {
      try {
        const data = await resolveImportedResumeData(pending, { useGravatar: false });
        const created = await createCv.mutateAsync({ data });
        toast.success('Your imported CV was saved to your account.');
        router.replace(`/dashboard/cv/${created.id}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Could not save your imported CV: ${error.message}`
            : 'Could not save your imported CV',
        );
      }
    })();
  }, [createCv, router]);

  return null;
}
