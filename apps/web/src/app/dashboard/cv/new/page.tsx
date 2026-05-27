import { NewCvPageClient } from './new-cv-page-client';

export default function NewCvPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create a new CV</h1>
        <p className="text-muted-foreground">
          Create a CV manually or import a JSON Resume file. Nothing is saved until you click Save
          or Import.
        </p>
      </div>
      <NewCvPageClient />
    </div>
  );
}
