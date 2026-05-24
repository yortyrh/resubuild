import { CvEditor } from '@/components/cv/cv-editor';

export default function NewCvPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New CV</h1>
        <p className="text-muted-foreground">
          Fill in the sections below. Data is validated against the JSON Resume schema on save.
        </p>
      </div>
      <CvEditor />
    </div>
  );
}
