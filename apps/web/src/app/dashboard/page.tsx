import Link from 'next/link';
import { CvList } from '@/components/dashboard/cv-list';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My CVs</h1>
          <p className="text-muted-foreground">
            Create and edit CVs that follow the JSON Resume schema.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cv/new">New CV</Link>
        </Button>
      </div>
      <CvList />
    </div>
  );
}
