import Link from 'next/link';
import { ApplicationWorkspaceBreadcrumb } from '@/components/applications/application-workspace-breadcrumb';
import { PrepareApplicationForm } from '@/components/applications/prepare-application-form';
import { Button } from '@/components/ui/button';

export default function NewApplicationPage() {
  return (
    <div className="space-y-4">
      <ApplicationWorkspaceBreadcrumb pageLabel="Preparing application…" />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Prepare application</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Paste a job posting or upload a file. One run produces a tailored CV and cover letter.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/applications">Cancel</Link>
        </Button>
      </header>

      <PrepareApplicationForm />
    </div>
  );
}
