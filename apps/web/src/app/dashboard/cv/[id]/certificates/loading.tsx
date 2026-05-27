import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvCertificatesLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="certificates" />
    </div>
  );
}
