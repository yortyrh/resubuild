import { CvPreviewClient } from './cv-preview-client';

export default async function CvPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="w-full py-2 lg:max-w-none">
      <CvPreviewClient cvId={id} />
    </div>
  );
}
