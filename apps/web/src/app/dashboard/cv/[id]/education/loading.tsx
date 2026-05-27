import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvEducationLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="education" />
    </div>
  );
}
