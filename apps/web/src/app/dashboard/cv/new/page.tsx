import { NewCvPageClient } from './new-cv-page-client';

export default function NewCvPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New CV</h1>
        <p className="text-muted-foreground">Setting up your CV editor…</p>
      </div>
      <NewCvPageClient />
    </div>
  );
}
