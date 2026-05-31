import Link from 'next/link';
import { PrepareApplicationForm } from '@/components/applications/prepare-application-form';

export default function NewApplicationPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/applications"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Back to applications
      </Link>
      <PrepareApplicationForm />
    </div>
  );
}
