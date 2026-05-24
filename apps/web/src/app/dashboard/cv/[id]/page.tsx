import { EditCvPageClient } from './edit-cv-page-client';

export default async function EditCvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCvPageClient cvId={id} />;
}
