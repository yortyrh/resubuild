import { CvPreviewClient } from './cv-preview-client';

export default async function CvPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container max-w-5xl py-6">
      <h1 className="no-print mb-4 text-2xl font-semibold tracking-tight">CV Preview</h1>
      <CvPreviewClient cvId={id} />
    </div>
  );
}
