import { CvPreviewClient } from './cv-preview-client';

export default async function CvPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container w-full max-w-5xl py-2 lg:max-w-none">
      <CvPreviewClient cvId={id} />
    </div>
  );
}
