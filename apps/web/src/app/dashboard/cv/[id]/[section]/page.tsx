import { notFound } from 'next/navigation';
import { isValidSectionSlug } from '@/components/cv/cv-section-nav';
import { EditCvPageClient } from '../edit-cv-page-client';

export default async function CvSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await params;

  if (!isValidSectionSlug(section) || section === 'basics') {
    notFound();
  }

  return <EditCvPageClient cvId={id} section={section} />;
}
