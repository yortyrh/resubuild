import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvProfilesLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="profiles" />
    </div>
  );
}
